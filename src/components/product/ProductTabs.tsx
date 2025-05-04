
import { TabsContent } from '@/components/ui/tabs';
import { BookingPeriod, Product } from '@/types/product';
import { formatDateRange } from '@/utils/dateUtils';
import { Clock, CalendarIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BookingCalendar from '@/components/BookingCalendar';
import RentalFeatures from './RentalFeatures';

interface ProductTabsProps {
  product: Product;
  bookings?: BookingPeriod[];
  onBookingChange: (booking: BookingPeriod) => void;
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
}

const ProductTabs = ({
  product,
  bookings,
  onBookingChange,
  bookingDates
}: ProductTabsProps) => {
  // Ensure bookings is always an array, even if undefined
  const validBookings = bookings || [];
  
  console.log('💡 validBookings:', validBookings);
  console.log('💡 bookingDates:', bookingDates);
  console.log(
    '💡 nearest:',
    validBookings
      .filter(b => b.startDate && b.endDate)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]
  );
  
  return <>
      <TabsContent value="details" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RentalFeatures />
          
          {/* Pricing Section */}
          <div className="p-6 rounded-xl glass-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Стоимость аренды</h3>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">4 часа:</span>
                <span className="font-medium">{(product.price * 0.7).toLocaleString()} ₽</span>
                <span className="text-xs text-green-600">(-30%)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">Сутки:</span>
                <span className="font-medium">{product.price.toLocaleString()} ₽</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">от 3-ех суток:</span>
                <span className="font-medium">{(product.price * 0.9).toLocaleString()} ₽/день</span>
                <span className="text-xs text-green-600">(-10%)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">от 5 дней:</span>
                <span className="font-medium">{(product.price * 0.7).toLocaleString()} ₽/день</span>
                <span className="text-xs text-green-600">(-30%)</span>
              </li>
            </ul>
          </div>
          
          {/* Availability Section */}
          <div className="p-6 rounded-xl glass-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Доступность</h3>
            </div>
            {product.available ? <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
                <CheckIcon className="h-4 w-4" />
                <span>Доступно для аренды</span>
              </div> : <div className="text-red-500 font-medium mb-4">Забронирован</div>}
            
            <div className="text-sm text-muted-foreground">
              {validBookings.length > 0 ? (
                (() => {
                  const nearest = [...validBookings]
                    .filter(booking => booking.startDate && booking.endDate) // Filter out bookings with undefined dates
                    .sort((a, b) => 
                      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                    )[0];
                  
                  return nearest ? (
                    <div>
                      <p className="mb-2 font-medium">Ближайшее бронирование:</p>
                      <div className="text-sm bg-secondary p-2 rounded">
                        {nearest.startDate && nearest.endDate ? 
                          formatDateRange(nearest.startDate, nearest.endDate) : 
                          'Дата не указана'}
                      </div>
                    </div>
                  ) : (
                    <p>Нет предстоящих бронирований.</p>
                  );
                })()
              ) : (
                <p>Нет предстоящих бронирований.</p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="availability">
        <div className="p-6 rounded-xl glass-card">
          <h3 className="font-medium mb-6">Календарь бронирования</h3>
          
          {product.available ? <div className="space-y-6">
              <p className="text-muted-foreground">
                Посмотрите календарь бронирования для выбора свободной даты.
              </p>
              
              {validBookings.length > 0 ? (() => {
                const filteredBookings = [...validBookings]
                  .filter(b => b.startDate && b.endDate);
                
                if (filteredBookings.length === 0) {
                  return <p className="mb-4">Нет предыдущих бронирований.</p>;
                }
                
                const last = filteredBookings.sort((a, b) => 
                  b.startDate.getTime() - a.startDate.getTime()
                )[0];
                
                return (
                  <p className="mb-4">
                    <strong>Последнее бронирование:</strong>{' '}
                    {formatDateRange(last.startDate, last.endDate)}
                  </p>
                );
              })() : (
                <p className="mb-4">Нет предыдущих бронирований.</p>
              )}

              {bookingDates.startDate && bookingDates.endDate && (() => {
                const conflict = validBookings.some(b =>
                  b.startDate && b.endDate &&
                  b.startDate.getTime() <= bookingDates.endDate.getTime() &&
                  b.endDate.getTime() >= bookingDates.startDate.getTime()
                );
                return (
                  <p className={`font-semibold ${conflict ? 'text-red-600' : 'text-green-600'}`}>
                    {conflict ? 'Бронирование недоступно' : 'Бронирование доступно'}
                  </p>
                );
              })()}
              
              <div className="max-w-md mx-auto">
                <BookingCalendar onBookingChange={onBookingChange} bookedPeriods={validBookings} />
              </div>
            </div> : <div className="text-center py-10">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">В настоящее время недоступен</h3>
              <p className="text-muted-foreground mb-6">
                В данный момент это оборудование недоступно для проката.
              </p>
              <Button asChild>
                <Link to="/catalog">Просмотрите альтернативные варианты</Link>
              </Button>
            </div>}
        </div>
      </TabsContent>
    </>;
};

export default ProductTabs;
