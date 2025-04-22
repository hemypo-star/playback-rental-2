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
    clearCart 
  } = useCartContext();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingChange = (booking: BookingPeriod) => {
    setSelectedBookingTime(booking);
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
        const startDate = selectedBookingTime ? selectedBookingTime.startDate : item.startDate;
        const endDate = selectedBookingTime ? selectedBookingTime.endDate : item.endDate;
        
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            product_id: item.productId,
            customer_name: formData.name,
            customer_email: formData.email,
            customer_phone: formData.phone,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'pending',
            total_price: item.price * Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ),
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
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <ShieldCheckIcon className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="heading-2 mb-4 text-center">Бронирование подтверждено!</h1>
        <p className="text-xl text-center text-muted-foreground mb-8 max-w-md">
         Ваш прокат оборудования подтвержден. Вскоре вы получите электронное письмо с подтверждением бронирования.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg">
            <Link to="/catalog">Вернуться к каталогу</Link>
          </Button>
        </div>
      </div>
    );
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
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ваша корзина</CardTitle>
              <CardDescription>Проверьте ваш заказ перед оформлением</CardDescription>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <div className="text-center py-10">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Ваша корзина пуста</h3>
                  <p className="text-muted-foreground mb-6">
                  Похоже, вы еще не добавили какое-либо оборудование в свою корзину.
                  </p>
                  <Button asChild>
                    <Link to="/catalog">Просмотр каталога</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item) => {
                    const hours = Math.ceil(
                      (item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60)
                    );
                    const days = Math.ceil(hours / 24);
                    
                    const pricingDetails = calculateRentalDetails(item.price, hours);
                    const itemTotal = pricingDetails.total;
                    
                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 subtle-ring">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            <CalendarIcon className="inline-block h-3 w-3 mr-1" />
                            {formatDateRange(item.startDate, item.endDate, true)}
                          </p>
                          
                          {pricingDetails.dayDiscount > 0 && (
                            <p className="text-xs text-green-600 mb-1">
                              Скидка: {pricingDetails.dayDiscount}%
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div>
                              {pricingDetails.discount > 0 ? (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm line-through text-muted-foreground">
                                    {formatCurrency(pricingDetails.subtotal)}
                                  </p>
                                  <p className="font-medium">
                                    {formatCurrency(itemTotal)}
                                  </p>
                                </div>
                              ) : (
                                <p className="font-medium">{formatCurrency(itemTotal)}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          {cartItems.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Редактировать время аренды</CardTitle>
                <CardDescription>Вы можете изменить время аренды если нужно</CardDescription>
              </CardHeader>
              <CardContent>
                <BookingCalendar
                  onBookingChange={handleBookingChange}
                  initialStartDate={cartItems[0]?.startDate}
                  initialEndDate={cartItems[0]?.endDate}
                  isCompact={false}
                />
                
                {selectedBookingTime && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-md">
                    <p className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Выбранное новое время аренды: {formatDateRange(
                        selectedBookingTime.startDate, 
                        selectedBookingTime.endDate, 
                        true
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Детали аренды</CardTitle>
              <CardDescription>Заполните информацию о вашем бронировании</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="name">Имя</label>
                    <Input 
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Иван Иванов"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="email">E-mail</label>
                    <Input 
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">Телефон</label>
                  <Input 
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Ваш заказ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => {
                const hours = Math.ceil(
                  (item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60)
                );
                const pricingDetails = calculateRentalDetails(item.price, hours);
                
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.title}</span>
                      <span>{formatCurrency(pricingDetails.total)}</span>
                    </div>
                    
                    {pricingDetails.dayDiscount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Скидка:</span>
                        <span>-{pricingDetails.dayDiscount}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого:</span>
                <span>{formatCurrency(getCartTotal())}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCheckout}
                disabled={loading || cartItems.length === 0}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Отправка...
                  </>
                ) : (
                  'Подтвердить бронирование'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
