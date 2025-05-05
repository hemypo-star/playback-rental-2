
import { TabsContent } from '@/components/ui/tabs';
import { BookingPeriod, Product } from '@/types/product';
import { formatDateRange } from '@/utils/dateUtils';
import { Clock, CalendarIcon, CheckIcon, XIcon } from 'lucide-react';
import RentalFeatures from './RentalFeatures';

interface ProductTabsProps {
  product: Product;
  bookings: BookingPeriod[];
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
  // Sort bookings by startDate
  const sortedBookings = [...bookings].sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );
  
  // Check if selected dates conflict with any booking
  const hasDateConflict = bookingDates.startDate && bookingDates.endDate && 
    sortedBookings.some(booking => 
      booking.startDate.getTime() <= bookingDates.endDate!.getTime() && 
      booking.endDate.getTime() >= bookingDates.startDate!.getTime()
    );
  
  // Get the nearest booking if any
  const nearestBooking = sortedBookings.length > 0 ? sortedBookings[0] : null;
  
  return (
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
            <>
              {bookingDates.startDate && bookingDates.endDate ? (
                hasDateConflict ? (
                  <div className="text-red-600 font-medium flex items-center gap-2 mb-4">
                    <XIcon className="h-4 w-4" />
                    <span>Товар недоступен для выбранных дат</span>
                  </div>
                ) : (
                  <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
                    <CheckIcon className="h-4 w-4" />
                    <span>Доступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
                  </div>
                )
              ) : (
                <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
                  <CheckIcon className="h-4 w-4" />
                  <span>Доступно для аренды</span>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                {nearestBooking ? (
                  <div>
                    <p className="mb-2 font-medium">Ближайшее бронирование:</p>
                    <div className="text-sm bg-secondary p-2 rounded">
                      {formatDateRange(nearestBooking.startDate, nearestBooking.endDate)}
                    </div>
                  </div>
                ) : (
                  <p className="mb-4">Нет предстоящих бронирований.</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-red-500 font-medium mb-4">Забронирован</div>
          )}
        </div>
      </div>
    </TabsContent>
  );
};

export default ProductTabs;
