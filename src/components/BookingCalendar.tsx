
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { addMonths, format, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { BookingPeriod } from '@/types/product';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import BookingPeriodSelect from './booking/BookingPeriodSelect';
import SelectedPeriod from './booking/SelectedPeriod';

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
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(initialStartDate || today);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialStartDate && initialEndDate ? {
    from: initialStartDate,
    to: initialEndDate
  } : undefined);
  const [startHour, setStartHour] = useState<string>(initialStartDate?.getHours().toString() || "9");
  const [endHour, setEndHour] = useState<string>(initialEndDate?.getHours().toString() || "18");

  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setDateRange({
        from: initialStartDate,
        to: initialEndDate
      });
      setStartHour(initialStartDate.getHours().toString());
      setEndHour(initialEndDate.getHours().toString());
    }
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    if (dateRange?.from) {
      const startWithTime = new Date(dateRange.from);
      startWithTime.setHours(parseInt(startHour), 0, 0);
      const endWithTime = new Date(dateRange.to || dateRange.from);
      endWithTime.setHours(parseInt(endHour), 0, 0);
      const newBooking: BookingPeriod = {
        id: 'temp-id',
        productId: 'temp-product',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: startWithTime,
        endDate: endWithTime,
        status: 'pending',
        totalPrice: 0,
        createdAt: new Date(),
        notes: ''
      };
      onBookingChange(newBooking);
    }
  }, [dateRange, startHour, endHour, onBookingChange]);

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const modifiersStyles = {
    day_selected: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: '500',
      borderRadius: '0.375rem'
    },
    day_range_start: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: '500',
      borderTopLeftRadius: '0.375rem !important',
      borderBottomLeftRadius: '0.375rem !important',
      borderTopRightRadius: '0 !important',
      borderBottomRightRadius: '0 !important'
    },
    day_range_end: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: '500',
      borderTopRightRadius: '0.375rem !important',
      borderBottomRightRadius: '0.375rem !important',
      borderTopLeftRadius: '0 !important',
      borderBottomLeftRadius: '0 !important'
    },
    day_range_middle: {
      backgroundColor: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      fontWeight: '500',
      borderRadius: '0 !important'
    }
  };

  return <div className={cn("border rounded-lg shadow-sm bg-card", className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Выберите даты аренды</h3>
        </div>
      </div>
      
      <div className="p-4 py-[10px]">
        <Calendar 
          mode="range" 
          month={currentMonth} 
          onMonthChange={setCurrentMonth} 
          selected={dateRange} 
          onSelect={setDateRange} 
          disabled={date => isBefore(date, today)} 
          modifiersStyles={modifiersStyles} 
          showOutsideDays 
          fixedWeeks 
          locale={ru} 
          numberOfMonths={1}
          className={cn("border-0 p-0 pointer-events-auto w-full max-w-none", isCompact && "scale-[0.9] origin-top")} 
        />
      </div>

      <BookingPeriodSelect startHour={startHour} endHour={endHour} onStartHourChange={setStartHour} onEndHourChange={setEndHour} />
      
      {dateRange?.from && <div className="p-4 border-t">
          <SelectedPeriod from={dateRange.from} to={dateRange.to || dateRange.from} />
        </div>}
    </div>;
};

export { BookingCalendar };
export default BookingCalendar;
