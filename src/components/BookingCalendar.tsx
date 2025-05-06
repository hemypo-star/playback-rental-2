
import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingPeriod } from '@/types/product';
import DateRangePickerRu from './booking/DateRangePickerRu';
import { isDateRangeAvailable } from '@/utils/dateUtils';

interface BookingCalendarProps {
  onBookingChange: (booking: BookingPeriod) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  bookedPeriods?: BookingPeriod[];
  isCompact?: boolean;
  className?: string;
}

const BookingCalendar = ({
  onBookingChange,
  initialStartDate,
  initialEndDate,
  bookedPeriods = [],
  isCompact = false,
  className
}: BookingCalendarProps) => {
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: initialStartDate || null,
    end: initialEndDate || null
  });

  const handleDateRangeChange = (newRange: { start: Date | null; end: Date | null }) => {
    setDateRange(newRange);
    
    if (newRange.start && newRange.end) {
      onBookingChange({
        id: 'temp-id',
        productId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: newRange.start,
        endDate: newRange.end,
        status: 'pending',
        totalPrice: 0,
        createdAt: new Date(),
        notes: ''
      });
    }
  };

  // Function to check if a date is unavailable due to booking
  const isDateUnavailable = (date: Date) => {
    if (!bookedPeriods || bookedPeriods.length === 0) return false;
    
    // Check if the date is within any booking period
    return bookedPeriods.some(booking => 
      date >= new Date(booking.startDate) && 
      date <= new Date(booking.endDate)
    );
  };

  return (
    <div className={cn("border rounded-lg shadow-sm bg-card flex flex-col h-full", className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Выберите даты аренды</h3>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <DateRangePickerRu
          onChange={handleDateRangeChange}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          className={cn(isCompact && "scale-[0.95] origin-top")}
          isDateUnavailable={isDateUnavailable}
          bookedPeriods={bookedPeriods}
        />
      </div>
    </div>
  );
};

export default BookingCalendar;
