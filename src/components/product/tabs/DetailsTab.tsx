
import React from "react";
import { Product, BookingPeriod } from "@/types/product";
import RentalFeatures from "../RentalFeatures";
import { Clock, CalendarIcon, CheckIcon, XIcon } from "lucide-react";
import { formatDateRange } from "@/utils/dateUtils";
import TimeSelect from "@/components/booking/TimeSelect";

interface DetailsTabProps {
  product: Product;
  bookings?: BookingPeriod[];
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}

const DetailsTab = ({ 
  product, 
  bookings = [], 
  bookingDates,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange
}: DetailsTabProps) => {
  // Ensure bookings is always an array, even if undefined
  const validBookings = bookings || [];
  
  return (
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
        
        {/* Time Selection */}
        {bookingDates.startDate && bookingDates.endDate && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium mb-3">Время аренды</h4>
            <div className="grid grid-cols-2 gap-3">
              <TimeSelect 
                label="Взять в" 
                value={startTime} 
                onValueChange={onStartTimeChange} 
              />
              <TimeSelect 
                label="Вернуть до" 
                value={endTime} 
                onValueChange={onEndTimeChange} 
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Availability Section */}
      <div className="p-6 rounded-xl glass-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
            <CalendarIcon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium">Доступность</h3>
        </div>
        <AvailabilityStatus 
          isAvailable={product.available}
          bookingDates={bookingDates}
          bookings={validBookings}
        />
      </div>
    </div>
  );
};

// Helper component for displaying availability status
const AvailabilityStatus = ({ 
  isAvailable, 
  bookingDates,
  bookings = []
}: { 
  isAvailable: boolean; 
  bookingDates: { startDate?: Date; endDate?: Date };
  bookings: BookingPeriod[];
}) => {
  if (!isAvailable) {
    return <div className="text-red-500 font-medium mb-4">Забронирован</div>;
  }

  const hasConflict = bookingDates.startDate && 
    bookingDates.endDate && 
    bookings.some(b =>
      b.startDate.getTime() <= bookingDates.endDate!.getTime() &&
      b.endDate.getTime() >= bookingDates.startDate!.getTime()
    );

  // Show date-based availability if dates are selected
  if (bookingDates.startDate && bookingDates.endDate) {
    if (hasConflict) {
      return (
        <div className="text-red-600 font-medium flex items-center gap-2 mb-4">
          <XIcon className="h-4 w-4" />
          <span>Недоступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
        </div>
      );
    }
    
    return (
      <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
        <CheckIcon className="h-4 w-4" />
        <span>Доступно для аренды с {formatDateRange(bookingDates.startDate, bookingDates.endDate)}</span>
      </div>
    );
  }
  
  // Default availability status
  return (
    <>
      <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
        <CheckIcon className="h-4 w-4" />
        <span>Доступно для аренды</span>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {bookings.length > 0 ? (() => {
          const nearest = [...bookings]
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
    </>
  );
};

export default DetailsTab;
