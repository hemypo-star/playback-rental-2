import { BookingPeriod, Product } from '@/types/product';
import { formatDateRange } from '@/utils/dateUtils';
import { CalendarIcon, CheckIcon, XIcon, InfoIcon } from 'lucide-react';
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
  
  // Function to find overlapping booking or the nearest upcoming booking
  const findRelevantBooking = (): BookingPeriod | null => {
    if (!bookingDates.startDate || !bookingDates.endDate) {
      // If no dates selected, just return the nearest upcoming booking
      const now = new Date();
      const upcomingBookings = sortedBookings.filter(booking => 
        booking.startDate.getTime() > now.getTime()
      );
      return upcomingBookings.length > 0 ? upcomingBookings[0] : null;
    }
    
    // First check for conflicts with selected dates
    const conflictingBooking = sortedBookings.find(booking => 
      booking.startDate.getTime() <= bookingDates.endDate!.getTime() && 
      booking.endDate.getTime() >= bookingDates.startDate!.getTime()
    );
    
    if (conflictingBooking) return conflictingBooking;
    
    // If no conflict, find the nearest upcoming booking
    const selectedEndDate = bookingDates.endDate.getTime();
    const upcomingBookings = sortedBookings.filter(booking => 
      booking.startDate.getTime() > selectedEndDate
    );
    
    return upcomingBookings.length > 0 ? upcomingBookings[0] : null;
  };
  
  // Get the relevant booking based on selection
  const relevantBooking = findRelevantBooking();
  
  // Check if selected dates conflict with any booking
  const hasDateConflict = bookingDates.startDate && bookingDates.endDate && 
    sortedBookings.some(booking => 
      booking.startDate.getTime() <= bookingDates.endDate!.getTime() && 
      booking.endDate.getTime() >= bookingDates.startDate!.getTime()
    );
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Компонент RentalFeatures должен адаптироваться под ширину родителя */}
        <RentalFeatures />
        
        {/* Availability Section */}
        <div className="p-8 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Доступность</h3>
          </div>
          
          {product.available ? (
            <div className="flex-1">
              {bookingDates.startDate && bookingDates.endDate ? (
                hasDateConflict ? (
                  <div className="text-destructive font-medium flex items-center gap-2 mb-6 p-4 bg-destructive/10 rounded-lg">
                    <XIcon className="h-5 w-5 shrink-0" />
                    <span>Товар недоступен для выбранных дат</span>
                  </div>
                ) : (
                  <div className="text-green-600 dark:text-green-500 font-medium flex items-center gap-2 mb-6 p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                    <CheckIcon className="h-5 w-5 shrink-0" />
                    <span>Доступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
                  </div>
                )
              ) : (
                <div className="text-green-600 dark:text-green-500 font-medium flex items-center gap-2 mb-6 p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                  <CheckIcon className="h-5 w-5 shrink-0" />
                  <span>Доступно для аренды</span>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mt-auto border-t pt-4">
                {relevantBooking && (
                  <div>
                    <p className="mb-2 font-medium flex items-center gap-2">
                      <InfoIcon className="h-4 w-4" />
                      {hasDateConflict ? "Конфликтующее бронирование:" : "Ближайшее бронирование:"}
                    </p>
                    <div className="text-sm bg-secondary/50 p-3 rounded-md border border-border/50">
                      <span className="font-medium text-foreground">
                        {formatDateRange(relevantBooking.startDate, relevantBooking.endDate)}
                      </span>
                      {hasDateConflict && (
                        <div className="mt-2 text-destructive font-medium">
                          Эти даты уже забронированы. Пожалуйста, выберите другой период в календаре.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!relevantBooking && (
                  <p className="flex items-center gap-2">
                    <InfoIcon className="h-4 w-4" /> 
                    Нет предстоящих бронирований. Свободно на любые даты!
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-destructive font-medium mb-4 p-4 bg-destructive/10 rounded-lg text-center">
              Товар снят с публикации или временно недоступен
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductTabs;