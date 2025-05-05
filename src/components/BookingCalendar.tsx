
import { useState } from 'react';
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
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: initialStartDate || null,
    end: initialEndDate || null
  });

  const handleDateRangeChange = (newRange: { start: Date | null; end: Date | null }) => {
    setDateRange(newRange);
  };

  const handleConfirm = () => {
    if (dateRange.start && dateRange.end) {
      onBookingChange({
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
      });
    }
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
        />
      </div>
      <div className="p-4 border-t flex justify-end mt-auto">
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white rounded-md"
          onClick={handleConfirm}
        >
          Подтвердить
        </button>
      </div>
    </div>
  );
};

export default BookingCalendar;
