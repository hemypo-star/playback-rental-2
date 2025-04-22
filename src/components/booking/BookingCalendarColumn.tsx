
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ru } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface BookingCalendarColumnProps {
  label: string;
  month: Date;
  onMonthChange: (date: Date) => void;
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  timeValue: string;
  onTimeChange: (time: string) => void;
  hours: { value: string; label: string }[];
  modifiersStyles: any;
  disabled: (date: Date) => boolean;
  className?: string;
}

const BookingCalendarColumn = ({
  label,
  month,
  onMonthChange,
  selected,
  onSelect,
  timeValue,
  onTimeChange,
  hours,
  modifiersStyles,
  disabled,
  className
}: BookingCalendarColumnProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="font-medium text-center">{label}</h3>
      <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
        <Calendar
          mode="range"
          defaultMonth={month}
          month={month}
          onMonthChange={onMonthChange}
          selected={selected}
          onSelect={onSelect}
          numberOfMonths={1}
          locale={ru}
          modifiersStyles={modifiersStyles}
          disabled={disabled}
          className="border-0"
        />
        <div className="p-4 border-t flex items-center">
          <Clock className="h-4 w-4 mr-2 text-blue-500" />
          <span className="mr-2">Время:</span>
          <Select 
            value={timeValue} 
            onValueChange={onTimeChange}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Выберите время" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((hour) => (
                <SelectItem key={hour.value} value={hour.value}>
                  {hour.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendarColumn;
