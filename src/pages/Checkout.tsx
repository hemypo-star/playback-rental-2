import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  ShieldCheckIcon, 
  TrashIcon,
  Clock,
  AlertTriangleIcon,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { formatDateRange } from '@/utils/dateUtils';
import { useCartContext } from '@/hooks/useCart';
import { createBooking } from '@/services/bookingService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import BookingCalendar from '@/components/BookingCalendar';
import { BookingPeriod } from '@/types/product';
import { calculateRentalPrice, calculateRentalDetails, formatCurrency } from '@/utils/pricingUtils';
import { isPhoneComplete } from '@/utils/phoneMask';
import CartList from '@/components/checkout/CartList';
import CartRentalPeriodEditor from '@/components/checkout/CartRentalPeriodEditor';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutSuccess from '@/components/checkout/CheckoutSuccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sendCheckoutNotification } from '@/services/telegramService';
import { useQueryClient } from '@tanstack/react-query';

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
  const [notificationStatus, setNotificationStatus] = useState<{
    status: 'idle' | 'sending' | 'partial' | 'success' | 'failed';
    message?: string;
    details?: string;
  }>({ status: 'idle' });

  const { 
    cartItems, 
    removeFromCart, 
    getCartTotal, 
    clearCart,
    updateCartDates 
  } = useCartContext();
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingChange = (booking: BookingPeriod) => {
    setSelectedBookingTime(booking);
    if (booking && booking.startDate && booking.endDate) {
      updateCartDates(booking.startDate, booking.endDate);
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
    
    setFormErrors(errors);
    return errors.length === 0;
  };
  
  const handleCheckout = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все поля формы корректно');
      return;
    }
    
    setLoading(true);
    setNotificationStatus({ status: 'sending', message: 'Обрабатываем заказ...' });
    
    try {
      // Group cart items by product ID and combine quantities
      const groupedItems = new Map<string, {
        productId: string;
        title: string;
        price: number;
        startDate: Date;
        endDate: Date;
        totalQuantity: number;
      }>();

      cartItems.forEach(item => {
        const key = item.productId;
        if (groupedItems.has(key)) {
          const existing = groupedItems.get(key)!;
          existing.totalQuantity += item.quantity;
        } else {
          groupedItems.set(key, {
            productId: item.productId,
            title: item.title,
            price: item.price,
            startDate: item.startDate,
            endDate: item.endDate,
            totalQuantity: item.quantity
          });
        }
      });

      console.log('Creating bookings for grouped items:', {
        originalItems: cartItems.length,
        groupedItems: groupedItems.size,
        groups: Array.from(groupedItems.values()).map(g => ({
          productId: g.productId,
          title: g.title,
          quantity: g.totalQuantity
        }))
      });

      // Create one booking per unique product with correct total quantity
      for (const group of groupedItems.values()) {
        const rentalPrice = calculateRentalPrice(group.price, group.startDate, group.endDate);
        const totalPrice = rentalPrice * group.totalQuantity;
        
        console.log('Creating booking:', {
          productId: group.productId,
          title: group.title,
          quantity: group.totalQuantity,
          rentalPrice,
          totalPrice
        });

        await createBooking({
          productId: group.productId,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          startDate: group.startDate.toISOString(),
          endDate: group.endDate.toISOString(),
          status: 'pending',
          totalPrice: totalPrice,
          quantity: group.totalQuantity,
          notes: `Заказ: ${group.title} (${group.totalQuantity} шт.)`
        });
      }
      
      // Invalidate all relevant caches after successful booking creation
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Invalidate specific product bookings for each unique product
      for (const group of groupedItems.values()) {
        await queryClient.invalidateQueries({ 
          queryKey: ['product-bookings', group.productId] 
        });
      }
      await queryClient.invalidateQueries({ 
        queryKey: ['cart-products'] 
      });
      
      // Send Telegram notification with enhanced feedback
      setNotificationStatus({ status: 'sending', message: 'Отправляем уведомление...' });
      
      try {
        console.log('Sending enhanced Telegram notification for checkout...');
        const result = await sendCheckoutNotification({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          items: Array.from(groupedItems.values()).map(group => ({
            title: group.title,
            price: group.price,
            startDate: group.startDate.toISOString(),
            endDate: group.endDate.toISOString(),
            quantity: group.totalQuantity
          })),
          totalAmount: getCartTotal()
        });
        
        if (result.success) {
          setNotificationStatus({ 
            status: 'success', 
            message: `Уведомление отправлено (${result.successfulChats}/${result.attemptedChats} получателей)` 
          });
          console.log('Enhanced Telegram notification sent successfully:', result);
          toast.success('Уведомление отправлено!');
        } else {
          const isPartialSuccess = result.successfulChats > 0;
          setNotificationStatus({ 
            status: isPartialSuccess ? 'partial' : 'failed',
            message: result.message,
            details: `Доставлено: ${result.successfulChats}/${result.attemptedChats} получателей`
          });
          
          if (isPartialSuccess) {
            console.warn('Partial notification delivery:', result);
            toast.warning('Заказ оформлен, но не все уведомления доставлены');
          } else {
            console.error('Failed to send notifications:', result);
            toast.warning('Заказ оформлен, но уведомления не отправлены');
          }
        }
      } catch (telegramError) {
        console.error('Error sending enhanced Telegram notification:', telegramError);
        setNotificationStatus({ 
          status: 'failed', 
          message: 'Ошибка отправки уведомлений',
          details: telegramError instanceof Error ? telegramError.message : 'Неизвестная ошибка'
        });
        toast.warning('Заказ оформлен, но произошла ошибка при отправке уведомлений');
      }
      
      clearCart();
      setOrderComplete(true);
      toast.success('Заказ оформлен успешно!');
      console.log('Booking completed successfully:', {
        uniqueProducts: groupedItems.size,
        totalValue: getCartTotal()
      });
    } catch (error) {
      console.error('Error during checkout:', error);
      setNotificationStatus({ 
        status: 'failed', 
        message: 'Ошибка при оформлении заказа',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
      toast.error('Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
      // Clear notification status after 5 seconds
      setTimeout(() => {
        setNotificationStatus({ status: 'idle' });
      }, 5000);
    }
  };

  const getStatusIcon = () => {
    switch (notificationStatus.status) {
      case 'sending': return <Clock className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusVariant = () => {
    switch (notificationStatus.status) {
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
      <h1 className="heading-2 mb-8">Корзина</h1>
      
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

      {notificationStatus.status !== 'idle' && (
        <Alert variant={getStatusVariant()} className="mb-6">
          {getStatusIcon()}
          <AlertDescription>
            <div className="font-medium">{notificationStatus.message}</div>
            {notificationStatus.details && (
              <div className="text-sm mt-1 opacity-90">{notificationStatus.details}</div>
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
          <CheckoutForm formData={formData} onInputChange={handleInputChange} />
          <div className="mt-6">
            <CheckoutOrderSummary onCheckout={handleCheckout} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
