import { TabsContent } from '@/components/ui/tabs';
import { BookingPeriod, Product } from '@/types/product';
import { formatDateRange } from '@/utils/dateUtils';
import { Clock, CalendarIcon, CheckIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BookingCalendar from '@/components/BookingCalendar';
import RentalFeatures from './RentalFeatures';
import TimeSelect from '../booking/TimeSelect';

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
  
  // Handle the confirm click for the red button
  const handleConfirm = () => {
    if (bookingDates.startDate && bookingDates.endDate) {
      onBookingChange({
        id: 'temp-id',
        productId: product.id,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: bookingDates.startDate,
        endDate: bookingDates.endDate,
        status: 'pending',
        totalPrice: 0,
        createdAt: new Date(),
        notes: ''
      });
    }
  };
  
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
            {product.available ? (
              // Dynamic availability block:
              bookingDates.startDate && bookingDates.endDate ? (
                // If dates selected, check for conflicts
                validBookings.some(b =>
                  b.startDate.getTime() <= bookingDates.endDate.getTime() &&
                  b.endDate.getTime()   >= bookingDates.startDate.getTime()
                ) ? (
                  // Conflict: show red "unavailable" WITH the date range
                  <div className="text-red-600 font-medium flex items-center gap-2 mb-4">
                    <XIcon className="h-4 w-4" />
                    <span>Недоступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
                  </div>
                ) : (
                  // No conflict: show green with selected range
                  <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
                    <CheckIcon className="h-4 w-4" />
                    <span>Доступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
                  </div>
                )
              ) : (
                // No dates selected: default green label
                <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
                  <CheckIcon className="h-4 w-4" />
                  <span>Доступно для аренды</span>
                </div>
              )
            ) : (
              // If product.available is false, keep the "Забронирован" red label
              <div className="text-red-500 font-medium mb-4">Забронирован</div>
            )}
            
            <div className="text-sm text-muted-foreground">
              {bookingDates.startDate && bookingDates.endDate && validBookings.some(b =>
                b.startDate.getTime() <= bookingDates.endDate.getTime() &&
                b.endDate.getTime()   >= bookingDates.startDate.getTime()
              ) ? (
                // Empty element as we already show the unavailable message above
                <></>
              ) : validBookings.length > 0 ? (() => {
                  const nearest = [...validBookings]
                    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
                  return (
                    <div>
                      <p className="mb-2 font-medium">Ближайшее бронирование:</p>
                      <div className="text-sm bg-secondary p-2 rounded">
                        {formatDateRange(nearest.startDate, nearest.endDate)}
                      </div>
                    </div>
                  );
                })() : (
                  <p className="mb-4">Нет предстоящих бронирований.</p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>
    </>;
};

export default ProductTabs;
