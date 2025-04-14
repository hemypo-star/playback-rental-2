
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { addMonths, format, isBefore, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { BookingPeriod } from '@/types/product';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  className,
}: BookingCalendarProps) => {
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(initialStartDate || today);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStartDate && initialEndDate 
      ? { from: initialStartDate, to: initialEndDate }
      : undefined
  );
  const [startHour, setStartHour] = useState<string>(initialStartDate?.getHours().toString() || "9");
  const [endHour, setEndHour] = useState<string>(initialEndDate?.getHours().toString() || "18");
  
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setDateRange({ from: initialStartDate, to: initialEndDate });
      setStartHour(initialStartDate.getHours().toString());
      setEndHour(initialEndDate.getHours().toString());
    }
  }, [initialStartDate, initialEndDate]);
  
  // Update booking when any date or time value changes
  useEffect(() => {
    if (dateRange?.from) {
      // Create dates with time
      const startWithTime = new Date(dateRange.from);
      startWithTime.setHours(parseInt(startHour), 0, 0);
      
      const endWithTime = new Date(dateRange.to || dateRange.from);
      endWithTime.setHours(parseInt(endHour), 0, 0);
      
      // Create booking object
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
  
  // Handle next month navigation
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Generate hour options (full hours only)
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: i < 10 ? `0${i}:00` : `${i}:00`
  }));
  
  // Custom day renderer to highlight the end date
  const modifiersStyles = {
    day_selected: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
    },
    day_range_end: {
      backgroundColor: 'hsl(var(--primary)) !important',
      color: 'hsl(var(--primary-foreground)) !important',
    }
  };
  
  return (
    <div className={cn(
      "border rounded-lg shadow-sm bg-card",
      className
    )}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Выберите даты аренды</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
      </div>
      
      <div className="p-4">
        <Calendar
          mode="range"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          selected={dateRange}
          onSelect={setDateRange}
          disabled={(date) => isBefore(date, today)}
          modifiersStyles={modifiersStyles}
          showOutsideDays
          fixedWeeks
          className={cn(
            "border-0 p-0 pointer-events-auto w-full max-w-none",
            isCompact && "scale-[0.9] origin-top"
          )}
        />
        
        {currentMonth && (
          <div className="flex justify-end mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNextMonth}
              className="text-xs"
            >
              Следующий месяц →
            </Button>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t bg-muted/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Время начала</label>
            <Select value={startHour} onValueChange={setStartHour}>
              <SelectTrigger className="w-full">
                <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Час" />
              </SelectTrigger>
              <SelectContent>
                {hours.map(hour => (
                  <SelectItem key={`start-hour-${hour.value}`} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Время окончания</label>
            <Select value={endHour} onValueChange={setEndHour}>
              <SelectTrigger className="w-full">
                <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Час" />
              </SelectTrigger>
              <SelectContent>
                {hours.map(hour => (
                  <SelectItem key={`end-hour-${hour.value}`} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {dateRange?.from && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md">
            <p className="text-sm font-medium">
              Выбранный период аренды:
            </p>
            <p className="text-sm mt-1">
              {dateRange.from ? format(dateRange.from, 'dd.MM.yyyy') : ''} {startHour}:00 — 
              {dateRange.to ? format(dateRange.to, 'dd.MM.yyyy') : format(dateRange.from, 'dd.MM.yyyy')} {endHour}:00
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export { BookingCalendar };
export default BookingCalendar;
