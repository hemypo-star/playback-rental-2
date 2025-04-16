
import { useState, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDateRange } from '@/utils/dateUtils';
import BookingCalendar from '@/components/BookingCalendar';
import { BookingPeriod } from '@/types/product';

interface DateFilterPopoverProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateRangeChange: (start: Date | undefined, end: Date | undefined) => void;
}

const DateFilterPopover = ({
  startDate,
  endDate,
  onDateRangeChange,
}: DateFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  
  // Update temp dates when props change
  useEffect(() => {
    if (startDate !== tempStartDate) {
      setTempStartDate(startDate);
    }
    
    if (endDate !== tempEndDate) {
      setTempEndDate(endDate);
    }
  }, [startDate, endDate]);
  
  const handleBookingChange = (booking: BookingPeriod) => {
    setTempStartDate(booking.startDate);
    setTempEndDate(booking.endDate);
    // Don't close the popover here, don't update parent state until Apply button is clicked
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    onDateRangeChange(undefined, undefined);
    setIsOpen(false);
  };
  
  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only update parent state and close popover when user explicitly applies
    onDateRangeChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };
  
  // Prevent popover from closing when clicking within the calendar
  const handlePopoverInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-12 w-full md:w-auto"
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {startDate && endDate ? formatDateRange(startDate, endDate, true) : "Выбрать время"}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-auto min-w-[420px]" 
        align="start"
        onClickCapture={handlePopoverInteraction}
        sideOffset={8}
      >
        <div className="p-4 space-y-4 w-full">
          <h3 className="font-medium">Выберите дату и время</h3>
          
          <BookingCalendar
            onBookingChange={handleBookingChange}
            initialStartDate={tempStartDate}
            initialEndDate={tempEndDate}
            isCompact={false} // Use full size in popover
            className="w-full"
          />
          
          <div className="pt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClear}
            >
              Очистить
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleApply}
            >
              Применить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateFilterPopover;
