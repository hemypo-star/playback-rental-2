import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, addDays, isBefore, isAfter, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BookingPeriod } from '@/types/product';
import DateRangePickerRu from '@/components/booking/DateRangePickerRu';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
type BookingCalendarProps = {
  onBookingChange: (booking: BookingPeriod) => void;
  bookedPeriods?: BookingPeriod[];
  initialStartDate?: Date;
  initialEndDate?: Date;
  isCompact?: boolean;
  onDateConfirmed?: () => void;
  className?: string; // Add missing className prop
  onClose?: () => void; // Add missing onClose prop
};
const BookingCalendar = ({
  onBookingChange,
  bookedPeriods = [],
  initialStartDate,
  initialEndDate,
  isCompact = false,
  onDateConfirmed,
  className,
  onClose
}: BookingCalendarProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Update local state when props change
  useEffect(() => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'dd MMM yyyy', {
      locale: ru
    });
  };

  // Check if a date is booked
  const isDateBooked = (date: Date) => {
    return bookedPeriods.some(period => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      return (isAfter(date, periodStart) || isSameDay(date, periodStart)) && (isBefore(date, periodEnd) || isSameDay(date, periodEnd));
    });
  };
  const handleDateRangeChange = useCallback((range: {
    start: Date | null;
    end: Date | null;
  }) => {
    if (range.start && range.end) {
      setStartDate(range.start);
      setEndDate(range.end);
      onBookingChange({
        id: '',
        productId: '',
        startDate: range.start,
        endDate: range.end,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        status: 'pending',
        totalPrice: 0,
        quantity: 1,
        createdAt: new Date()
      });
      setIsOpen(false);
    }
  }, [onBookingChange]);

  // Clear selected dates
  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onBookingChange({
      id: '',
      productId: '',
      startDate: new Date(0),
      endDate: new Date(0),
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      status: 'pending',
      totalPrice: 0,
      quantity: 1,
      createdAt: new Date()
    });
  };

  // Handle close functionality
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };
  return <div className={cn("space-y-4", className)}>
      <div className={cn("flex items-center gap-2", isCompact ? "flex-col items-start" : "flex-row items-center")}>
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#ea384c]" />
            <span className="text-sm text-[#222]">
              {startDate && endDate ? `${formatDate(startDate)} — ${formatDate(endDate)}` : "Выберите даты аренды"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {startDate && endDate && <Button variant="ghost" size="sm" onClick={handleClearDates} className="h-8 px-2 text-xs">
              Очистить
            </Button>}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate && endDate ? "Изменить даты" : "Выбрать даты"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0 px-[20px] py-[10px] mx-[50px]">
              <DateRangePickerRu onChange={handleDateRangeChange} initialStartDate={startDate} initialEndDate={endDate} onClose={handleClose} onDateConfirmed={onDateConfirmed} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>;
};
export default BookingCalendar;