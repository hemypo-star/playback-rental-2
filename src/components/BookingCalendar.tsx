
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingPeriod } from '@/types/product';
import DateRangePickerRu from './booking/DateRangePickerRu';

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
  bookedPeriods,
  isCompact = false,
  className
}: BookingCalendarProps) => {
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: initialStartDate || null,
    end: initialEndDate || null
  });

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      const newBooking: BookingPeriod = {
        id: 'temp-id',
        productId: 'temp-product',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: dateRange.start,
        endDate: dateRange.end,
        status: 'pending',
        totalPrice: 0,
        createdAt: new Date(),
        notes: ''
      };
      onBookingChange(newBooking);
    }
  }, [dateRange, onBookingChange]);

  const handleDateRangeChange = (newRange: { start: Date | null; end: Date | null }) => {
    setDateRange(newRange);
  };

  return (
    <div className={cn("border rounded-lg shadow-sm bg-card", className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Выберите даты аренды</h3>
        </div>
      </div>
      
      <div className="p-4">
        <DateRangePickerRu
          onChange={handleDateRangeChange}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          className={cn(isCompact && "scale-[0.95] origin-top")}
        />
      </div>
    </div>
  );
};

export { BookingCalendar };
export default BookingCalendar;
