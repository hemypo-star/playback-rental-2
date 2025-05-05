
import { useState } from 'react';
import { ru } from 'date-fns/locale';
import { format, isBefore } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingCalendarColumn from './BookingCalendarColumn';

interface BookingDateRangePickerProps {
  onChange: (dateRange: {
    start: Date | null;
    end: Date | null;
  }) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  className?: string;
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 10).map(hour => ({
  value: hour.toString(),
  label: `${hour}:00`
}));

const BookingDateRangePicker = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className
}: BookingDateRangePickerProps) => {
  const [leftMonth, setLeftMonth] = useState<Date>(initialStartDate ? new Date(initialStartDate) : new Date());
  const [rightMonth, setRightMonth] = useState<Date>(initialStartDate ? new Date(initialStartDate) : new Date());
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStartDate && initialEndDate 
      ? { 
          from: initialStartDate, 
          to: initialEndDate 
        } 
      : undefined
  );
  
  const [startTime, setStartTime] = useState<string>(
    initialStartDate 
      ? initialStartDate.getHours().toString() 
      : "14"
  );
  
  const [endTime, setEndTime] = useState<string>(
    initialEndDate 
      ? initialEndDate.getHours().toString() 
      : "9"
  );

  const handleLeftMonthChange = (month: Date) => {
    setLeftMonth(month);
    setRightMonth(month);
  };

  const handleRightMonthChange = (month: Date) => {
    setRightMonth(month);
    setLeftMonth(month);
  };

  const handleConfirmDates = () => {
    if (!dateRange?.from) return;

    const start = new Date(dateRange.from);
    start.setHours(parseInt(startTime, 10), 0, 0, 0);

    let end: Date | null = null;
    if (dateRange.to) {
      end = new Date(dateRange.to);
      end.setHours(parseInt(endTime, 10), 0, 0, 0);
    }

    onChange({ start, end });
  };

  const modifiersStyles = {
    range_start: {
      color: 'white',
      backgroundColor: '#ea384c',
      borderTopLeftRadius: '50%',
      borderBottomLeftRadius: '50%',
    },
    range_end: {
      color: 'white',
      backgroundColor: '#ea384c',
      borderTopRightRadius: '50%',
      borderBottomRightRadius: '50%',
    },
    range_middle: {
      color: 'black',
      backgroundColor: '#0EA5E9',
      opacity: 0.2
    }
  };

  const isDateDisabled = (date: Date): boolean => {
    return isBefore(date, new Date());
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingCalendarColumn
          label="Взять"
          month={leftMonth}
          onMonthChange={handleLeftMonthChange}
          selected={dateRange}
          onSelect={setDateRange}
          timeValue={startTime}
          onTimeChange={setStartTime}
          hours={HOURS}
          modifiersStyles={modifiersStyles}
          disabled={isDateDisabled}
        />
        <BookingCalendarColumn
          label="Вернуть"
          month={rightMonth}
          onMonthChange={handleRightMonthChange}
          selected={dateRange}
          onSelect={setDateRange}
          timeValue={endTime}
          onTimeChange={setEndTime}
          hours={HOURS}
          modifiersStyles={modifiersStyles}
          disabled={isDateDisabled}
        />
      </div>

      <div className="flex justify-center items-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#ea384c]" />
          <span className="text-sm">Взять в:</span>
          <Select value={startTime} onValueChange={setStartTime}>
            <SelectTrigger className="w-[90px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map(hour => (
                <SelectItem key={hour.value} value={hour.value}>
                  {hour.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#ea384c]" />
          <span className="text-sm">Вернуть до:</span>
          <Select value={endTime} onValueChange={setEndTime}>
            <SelectTrigger className="w-[90px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map(hour => (
                <SelectItem key={hour.value} value={hour.value}>
                  {hour.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          className="text-[#ea384c] border-[#ea384c] hover:bg-[#ea384c] hover:text-white"
          onClick={handleConfirmDates}
        >
          Подтвердить время
        </Button>
      </div>

      {dateRange?.from && (
        <div className="p-4 border rounded-lg bg-blue-50">
          <h3 className="font-medium mb-2">Выбранный период:</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center">
              <span className="font-medium">Взять:</span> 
              <span className="ml-2">
                {format(dateRange.from, 'dd MMMM yyyy', { locale: ru })} в {startTime}:00
              </span>
            </div>
            
            {dateRange.to && (
              <div className="flex items-center">
                <span className="font-medium sm:ml-4">Вернуть:</span>
                <span className="ml-2">
                  {format(dateRange.to, 'dd MMMM yyyy', { locale: ru })} в {endTime}:00
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDateRangePicker;
