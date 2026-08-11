import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  AlertTriangleIcon,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useCartContext } from '@/hooks/useCart';
import { createBooking } from '@/services/bookingService';
import { toast } from 'sonner';
import { BookingPeriod } from '@/types/product';
import { calculateRentalPrice } from '@/utils/pricingUtils';
import { isPhoneComplete } from '@/utils/phoneMask';
import CartList from '@/components/checkout/CartList';
import CartRentalPeriodEditor from '@/components/checkout/CartRentalPeriodEditor';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutSuccess from '@/components/checkout/CheckoutSuccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sendOrderWebhookDirect } from '@/services/serverApi';
import { useQueryClient } from '@tanstack/react-query';
import { useBookingDates } from '@/contexts/BookingDatesContext';

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedBookingTime, setSelectedBookingTime] = useState<BookingPeriod | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<{
    status: 'idle' | 'sending' | 'partial' | 'success' | 'failed';
    message?: string;
    details?: string;
  }>({ status: 'idle' });

  const {
    cartItems,
    getCartTotal,
    clearCart,
    updateCartDates
  } = useCartContext();
  const { setBookingDates: setGlobalBookingDates } = useBookingDates();

  const queryClient = useQueryClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingChange = (booking: BookingPeriod) => {
    setSelectedBookingTime(booking);
    if (booking && booking.startDate && booking.endDate) {
      updateCartDates(booking.startDate, booking.endDate);
      // Keep the site-wide selected dates in sync too, so the search bar
      // and catalog reflect the period chosen here in the cart
      setGlobalBookingDates(booking.startDate, booking.endDate);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Имя не должно быть пустым');
    }
    
    if (!/^[A-Za-zА-Яа-яЁё\s\-]+$/.test(formData.name.trim())) {
      errors.push('Имя может содержать только буквы');
    }
    
    if (!formData.email.trim()) {
      errors.push('Email не должен быть пустым');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.push('Введите корректный email');
    }
    
    if (!isPhoneComplete(formData.phone)) {
      errors.push('Телефон должен содержать 10 цифр в формате +7 (XXX) XXX-XX-XX');
    }
    
    if (cartItems.length === 0) {
      errors.push('Корзина пуста');
    }

    // 🛑 АРХИТЕКТУРНЫЙ ГЕЙТ: Проверка наличия дат
    if (cartItems.some(item => !item.startDate || !item.endDate)) {
      errors.push('Необходимо выбрать даты аренды для товаров в корзине');
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };
  
  const handleCheckout = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед оформлением');
      return;
    }
    
    setLoading(true);
    setWebhookStatus({ status: 'sending', message: 'Обрабатываем заказ...' });
    
    const orderId = crypto.randomUUID(); 
    
    try {
      const groupedItems = new Map<string, any>();
      cartItems.forEach(item => {
        const key = item.productId;
        if (groupedItems.has(key)) {
          groupedItems.get(key)!.totalQuantity += item.quantity;
        } else {
          groupedItems.set(key, { ...item, totalQuantity: item.quantity });
        }
      });

      const groupedArray = Array.from(groupedItems.values());

      for (const group of groupedArray) {
        // Мы уже прошли validateForm, поэтому уверены в наличии startDate и endDate
        const rentalPrice = calculateRentalPrice(group.price, group.startDate!, group.endDate!);
        const totalPrice = rentalPrice * group.totalQuantity;
        
        await createBooking({
          order_id: orderId,
          productId: group.productId,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          startDate: group.startDate!.toISOString(),
          endDate: group.endDate!.toISOString(),
          status: 'pending',
          totalPrice: totalPrice,
          quantity: group.totalQuantity,
          notes: `Заказ: ${group.title} (${group.totalQuantity} шт.)`
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      for (const group of groupedArray) {
        await queryClient.invalidateQueries({ 
          queryKey: ['product-bookings', group.productId] 
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['cart-products'] });

      setWebhookStatus({ status: 'sending', message: 'Отправляем заказ в webhook...' });

      const orderPayload = {
        orderId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        items: groupedArray.map(g => {
          const rentalPrice = calculateRentalPrice(g.price, g.startDate!, g.endDate!);

          return {
            productId: g.productId,
            title: g.title,
            price: g.price,
            quantity: g.totalQuantity,
            startDate: g.startDate!.toISOString(),
            endDate: g.endDate!.toISOString(),
            startTime: g.startDate!.getHours().toString().padStart(2, '0') + ':00',
            endTime: g.endDate!.getHours().toString().padStart(2, '0') + ':00',
            totalPrice: rentalPrice * g.totalQuantity,
          };
        }),
        totalAmount: getCartTotal(),
        currency: 'RUB',
      };

      try {
        const response = await sendOrderWebhookDirect(orderPayload);

        if (response && response.success) {
          setWebhookStatus({ status: 'success', message: 'Заказ отправлен в webhook!' });
        } else {
          setWebhookStatus({ status: 'partial', message: 'Заказ сохранён, но webhook вернул ошибку' });
        }
      } catch (webhookError) {
        console.error('Order webhook failed:', webhookError);
        setWebhookStatus({
          status: 'partial',
          message: 'Заказ сохранён, но не отправлен в webhook',
          details: webhookError instanceof Error ? webhookError.message : 'Неизвестная ошибка webhook',
        });
      }
      
      clearCart();
      setOrderComplete(true);
      toast.success('Заказ оформлен успешно!');

    } catch (error) {
      console.error('Checkout error:', error);
      setWebhookStatus({ 
        status: 'failed', 
        message: 'Ошибка при оформлении заказа',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
      toast.error('Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setWebhookStatus({ status: 'idle' });
      }, 5000);
    }
  };

  const getStatusIcon = () => {
    switch (webhookStatus.status) {
      case 'sending': return <Clock className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusVariant = () => {
    switch (webhookStatus.status) {
      case 'success': return 'default';
      case 'partial': return 'default';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  if (orderComplete) {
    return <CheckoutSuccess />;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center mb-8">
        <Link to="/catalog" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Вернуться к каталогу
        </Link>
      </div>
      <h1 className="heading-2 mb-8">Оформление заказа</h1>
      
      {formErrors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Пожалуйста, исправьте следующие ошибки:</div>
            <ul className="list-disc pl-5 mt-2">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {webhookStatus.status !== 'idle' && (
        <Alert variant={getStatusVariant()} className="mb-6">
          {getStatusIcon()}
          <AlertDescription>
            <div className="font-medium">{webhookStatus.message}</div>
            {webhookStatus.details && (
              <div className="text-sm mt-1 opacity-90">{webhookStatus.details}</div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CartList />
          {cartItems.length > 0 && (
            <CartRentalPeriodEditor
              initialStartDate={cartItems[0]?.startDate}
              initialEndDate={cartItems[0]?.endDate}
              onBookingChange={handleBookingChange}
              selectedBookingTime={selectedBookingTime}
            />
          )}
        </div>
        <div>
          <CheckoutForm formData={formData} onInputChange={handleInputChange} onSubmit={handleCheckout} />
          <div className="mt-6">
            <CheckoutOrderSummary onCheckout={handleCheckout} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;