
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
import { useBookingDates } from '@/contexts/BookingDatesContext';

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
  const { startDate: globalStartDate, endDate: globalEndDate, setBookingDates } = useBookingDates();
  
  // Use global dates as fallback if props not provided
  const effectiveStartDate = startDate || globalStartDate;
  const effectiveEndDate = endDate || globalEndDate;
  
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(effectiveStartDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(effectiveEndDate);
  
  useEffect(() => {
    if (effectiveStartDate !== tempStartDate) {
      setTempStartDate(effectiveStartDate);
    }
    
   if (effectiveEndDate !== tempEndDate) {
      setTempEndDate(effectiveEndDate);
    }
  }, [effectiveStartDate, effectiveEndDate]);
  
  const handleBookingChange = (booking: BookingPeriod) => {
    setTempStartDate(booking.startDate);
    setTempEndDate(booking.endDate);
    
    // Update both local and global state
    onDateRangeChange(booking.startDate, booking.endDate);
    setBookingDates(booking.startDate, booking.endDate);
    
    // Force close the popover
    setIsOpen(false);
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
    onDateRangeChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };
  
  const handlePopoverInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleClose = () => {
    // Ensure the popover closes
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-12 w-full md:w-auto"
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {effectiveStartDate && effectiveEndDate ? formatDateRange(effectiveStartDate, effectiveEndDate, true) : "Выбрать время"}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-auto min-w-[420px]" 
        align="start"
        onClickCapture={handlePopoverInteraction}
        sideOffset={8}
        forceMount={true}
      >
        <div className="p-4 space-y-4 w-full">
          <h3 className="font-medium">Выберите дату и время</h3>
          
          <BookingCalendar
            onBookingChange={handleBookingChange}
            initialStartDate={tempStartDate}
            initialEndDate={tempEndDate}
            isCompact={false}
            className="w-full"
            onClose={handleClose}
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
