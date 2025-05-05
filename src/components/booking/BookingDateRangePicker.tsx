import { useState, useEffect } from 'react';
import { ru } from 'date-fns/locale';
import { format, isAfter, isBefore, addMonths, startOfMonth, setHours } from 'date-fns';
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
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(leftMonth, 1));
  
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
    setRightMonth(addMonths(month, 1));
  };

  const handleRightMonthChange = (month: Date) => {
    setRightMonth(month);
    setLeftMonth(addMonths(month, -1));
  };

  useEffect(() => {
    if (!dateRange?.from) return;

    const start = new Date(dateRange.from);
    start.setHours(parseInt(startTime, 10), 0, 0, 0);

    let end: Date | null = null;
    if (dateRange.to) {
      end = new Date(dateRange.to);
      end.setHours(parseInt(endTime, 10), 0, 0, 0);
      
      if (isBefore(end, start)) {
        if (format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
          setEndTime(startTime);
          end.setHours(parseInt(startTime, 10), 0, 0, 0);
        }
      }
    }

    onChange({ start, end });
  }, [dateRange, startTime, endTime, onChange]);

  const modifiersStyles = {
    range_start: {
      color: 'white',
      backgroundColor: '#ea384c', // Red accent
      borderTopLeftRadius: '50%',
      borderBottomLeftRadius: '50%',
    },
    range_end: {
      color: 'white',
      backgroundColor: '#ea384c', // Red accent
      borderTopRightRadius: '50%',
      borderBottomRightRadius: '50%',
    },
    range_middle: {
      color: 'black',
      backgroundColor: '#0EA5E9', // Dark blue with opacity
      opacity: 0.2
    }
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
          disabled={date => isBefore(date, new Date()) ? "opacity-50" : false}
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
          disabled={date => isBefore(date, new Date()) ? "opacity-50" : false}
        />
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
