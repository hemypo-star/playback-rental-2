
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface BookingCalendarColumnProps {
  label: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  timeValue: string;
  onTimeChange: (value: string) => void;
  hours: { value: string; label: string }[];
  modifiersStyles?: Record<string, React.CSSProperties>;
  disabled: (date: Date) => boolean;
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
  disabled
}: BookingCalendarColumnProps) => {
  return (
    <div className="flex flex-col p-4 border rounded-lg shadow-sm">
      <h3 className="font-medium mb-3">{label}</h3>
      <Calendar
        mode="range"
        month={month}
        onMonthChange={onMonthChange}
        selected={selected}
        onSelect={onSelect}
        locale={ru}
        className="rounded-md border"
        modifiersStyles={modifiersStyles}
        disabled={disabled}
      />
      <div className="mt-2 flex items-center">
        <Clock className="h-4 w-4 mr-2 text-gray-500" />
        <span className="text-sm text-gray-600 mr-2">
          {label === "Взять" ? "Время получения:" : "Время возврата:"}
        </span>
        <Select value={timeValue} onValueChange={onTimeChange}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Время" />
          </SelectTrigger>
          <SelectContent>
            {hours.map(hour => (
              <SelectItem key={hour.value} value={hour.value}>
                {hour.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BookingCalendarColumn;
