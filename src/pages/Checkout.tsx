import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  ShieldCheckIcon, 
  TrashIcon,
  Clock,
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
import { createBooking } from '@/services/apiService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BookingCalendar from '@/components/BookingCalendar';
import { BookingPeriod } from '@/types/product';
import { calculateRentalPrice, calculateRentalDetails, formatCurrency } from '@/utils/pricingUtils';
import CartList from '@/components/checkout/CartList';
import CartRentalPeriodEditor from '@/components/checkout/CartRentalPeriodEditor';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutSuccess from '@/components/checkout/CheckoutSuccess';

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [selectedBookingTime, setSelectedBookingTime] = useState<BookingPeriod | null>(null);

  const { 
    cartItems, 
    removeFromCart, 
    getCartTotal, 
    clearCart,
    updateCartDates 
  } = useCartContext();
  
  const navigate = useNavigate();
  const location = useLocation();
  
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
  
  const handleCheckout = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Необходимо заполнить все поля",
        description: "Пожалуйста, заполните все поля формы для оформления заказа",
        variant: "destructive",
      });
      return;
    }
    if (cartItems.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары в корзину перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      for (const item of cartItems) {
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            product_id: item.productId,
            customer_name: formData.name,
            customer_email: formData.email,
            customer_phone: formData.phone,
            start_date: item.startDate.toISOString(),
            end_date: item.endDate.toISOString(),
            status: 'pending',
            total_price: calculateRentalPrice(item.price, item.startDate, item.endDate),
            notes: `Бронирование из корзины: ${item.title}`
          });
        if (error) {
          console.error("Booking error:", error);
          throw error;
        }
      }
      clearCart();
      setOrderComplete(true);
      console.log('Booking completed successfully:', {
        items: cartItems.length,
        totalValue: getCartTotal()
      });
    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Ошибка при оформлении заказа",
        description: "Пожалуйста, попробуйте еще раз позже",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <CheckoutForm formData={formData} onInputChange={handleInputChange} />
        </div>
        <div>
          <CheckoutOrderSummary onCheckout={handleCheckout} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
