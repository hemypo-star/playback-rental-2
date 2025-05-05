
import React from "react";
import { Product, BookingPeriod } from "@/types/product";
import { CheckIcon, XIcon, CalendarIcon } from "lucide-react";
import { formatDateRange } from "@/utils/dateUtils";
import BookingCalendar from "@/components/BookingCalendar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AvailabilityTabProps {
  product: Product;
  bookings?: BookingPeriod[];
  onBookingChange: (booking: BookingPeriod) => void;
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
  onConfirmTime: () => void;
}

const AvailabilityTab = ({ 
  product, 
  bookings = [], 
  onBookingChange, 
  bookingDates,
  onConfirmTime
}: AvailabilityTabProps) => {
  // Ensure bookings is always an array
  const validBookings = bookings || [];
  
  if (!product.available) {
    return (
      <div className="p-6 rounded-xl glass-card">
        <h3 className="font-medium mb-6">Календарь бронирования</h3>
        <div className="text-center py-10">
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
        </div>
      </div>
    );
  }
  
  // Check if there's a booking conflict
  const hasConflict = bookingDates.startDate && bookingDates.endDate && 
    validBookings.some(b =>
      b.startDate.getTime() <= bookingDates.endDate!.getTime() &&
      b.endDate.getTime() >= bookingDates.startDate!.getTime()
    );
    
  return (
    <div className="p-6 rounded-xl glass-card">
      <h3 className="font-medium mb-6">Календарь бронирования</h3>
      
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Посмотрите календарь бронирования для выбора свободной даты.
        </p>
        
        {/* Dynamic availability label based on selected dates */}
        <AvailabilityStatus 
          bookingDates={bookingDates} 
          bookings={validBookings} 
        />
        
        <BookingHistory bookings={validBookings} />
        
        {/* Show conflict status if dates are selected */}
        {bookingDates.startDate && bookingDates.endDate && (
          <p className={`font-semibold ${hasConflict ? 'text-red-600' : 'text-green-600'}`}>
            {hasConflict ? 'Бронирование недоступно' : 'Бронирование доступно'}
          </p>
        )}
        
        <div className="max-w-md mx-auto">
          <BookingCalendar 
            onBookingChange={onBookingChange} 
            bookedPeriods={validBookings}
            initialStartDate={bookingDates.startDate}
            initialEndDate={bookingDates.endDate}
          />
          
          {/* Button for confirming time */}
          <div className="flex items-center gap-4 mt-4">
            <button
              type="button"
              className="px-4 py-2 border border-red-500 text-red-500 rounded-md ml-auto"
              onClick={onConfirmTime}
            >
              Подтвердить время
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for displaying availability status
const AvailabilityStatus = ({ 
  bookingDates, 
  bookings = [] 
}: { 
  bookingDates: { startDate?: Date; endDate?: Date };
  bookings: BookingPeriod[];
}) => {
  if (!bookingDates.startDate || !bookingDates.endDate) {
    return (
      <div className="text-green-600 font-medium flex items-center gap-2 mb-4">
        <CheckIcon className="h-4 w-4" />
        <span>Доступно для аренды</span>
      </div>
    );
  }

  const hasConflict = bookings.some(b =>
    b.startDate.getTime() <= bookingDates.endDate!.getTime() &&
    b.endDate.getTime() >= bookingDates.startDate!.getTime()
  );

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
};

// Helper component for displaying booking history
const BookingHistory = ({ bookings = [] }: { bookings: BookingPeriod[] }) => {
  if (bookings.length === 0) {
    return <p className="mb-4">Нет предыдущих бронирований.</p>;
  }

  const filteredBookings = bookings.filter(b => b.startDate && b.endDate);
  
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
};

export default AvailabilityTab;
