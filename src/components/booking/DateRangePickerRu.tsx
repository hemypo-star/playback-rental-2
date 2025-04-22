
import React, { useState, useEffect } from 'react';
import { ru } from 'date-fns/locale';
import { format, addMonths, isBefore, isAfter, isSameDay, isWithinInterval, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateRangePickerRuProps {
  onChange: (range: {
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
})); // Fixed: Added missing closing parenthesis here

const DateRangePickerRu = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className
}: DateRangePickerRuProps) => {
  const [leftMonth, setLeftMonth] = useState<Date>(initialStartDate ? startOfMonth(initialStartDate) : startOfMonth(new Date()));
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(leftMonth, 1));
  
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  const [selection, setSelection] = useState<{
    from: Date | null;
    to: Date | null;
  }>({
    from: initialStartDate || null,
    to: initialEndDate || null
  });
  
  const [startTime, setStartTime] = useState<string>(
    initialStartDate ? initialStartDate.getHours().toString() : "10"
  );
  
  const [endTime, setEndTime] = useState<string>(
    initialEndDate ? initialEndDate.getHours().toString() : "10"
  );

  const handlePrevMonth = () => {
    setLeftMonth(prevMonth => {
      const newLeftMonth = addMonths(prevMonth, -1);
      setRightMonth(addMonths(newLeftMonth, 1));
      return newLeftMonth;
    });
  };

  const handleNextMonth = () => {
    setRightMonth(prevMonth => {
      const newRightMonth = addMonths(prevMonth, 1);
      setLeftMonth(addMonths(newRightMonth, -1));
      return newRightMonth;
    });
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date())) return;
    
    setSelection(prev => {
      // If no selection or both dates selected, start a new selection
      if (!prev.from || (prev.from && prev.to)) {
        return { from: date, to: null };
      }
      
      // If only start date is selected
      if (prev.from && !prev.to) {
        // If clicking on the same date, deselect it
        if (isSameDay(date, prev.from)) {
          return { from: null, to: null };
        }
        
        // If clicking on a date before start date, swap them
        if (isBefore(date, prev.from)) {
          return { from: date, to: prev.from };
        }
        
        // Otherwise, complete the range
        return { from: prev.from, to: date };
      }
      
      return prev;
    });
  };

  const handleDateHover = (date: Date) => {
    setHoverDate(date);
  };

  const getDateClasses = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isDisabled = isBefore(date, today);
    const isStart = selection.from && isSameDay(date, selection.from);
    const isEnd = selection.to && isSameDay(date, selection.to);
    const isToday = isSameDay(date, today);
    
    let isInRange = false;
    let isInHoverRange = false;
    
    // Check if date is in selected range
    if (selection.from && selection.to) {
      isInRange = isWithinInterval(date, {
        start: selection.from,
        end: selection.to
      });
    }
    
    // Check if date is in hover preview range
    if (selection.from && !selection.to && hoverDate && isAfter(hoverDate, selection.from)) {
      isInHoverRange = isWithinInterval(date, {
        start: selection.from,
        end: hoverDate
      });
    }
    
    return cn(
      "w-10 h-10 flex items-center justify-center text-sm relative",
      "transition-colors duration-200 cursor-pointer select-none",
      isDisabled ? "text-gray-300 pointer-events-none opacity-40" : "hover:bg-red-50",
      isToday ? "border border-red-400" : "",
      isStart ? "bg-[#1B1F3B] text-white rounded-l-full z-10" : "",
      isEnd ? "bg-[#1B1F3B] text-white rounded-r-full z-10" : "",
      (isInRange || isInHoverRange) && !isStart && !isEnd ? "bg-red-50" : "",
      (isStart || isEnd) && "font-medium"
    );
  };

  const getDayKey = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const renderMonth = (monthDate: Date, label: string, timeValue: string, onTimeChange: (value: string) => void) => {
    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    // Get the day of week of the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDayOfMonth.getDay();
    // Adjust for Monday as first day of week (convert Sunday from 0 to 7)
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
    
    // Create array for days of month plus empty slots for padding
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 1; i < firstDayOfWeek; i++) {
      daysArray.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      daysArray.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
    
    // Russian days of week (starting with Monday)
    const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    
    return (
      <div className="flex flex-col">
        <div className="text-center mb-4">
          <h3 className="font-medium text-lg">{label}</h3>
        </div>
        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-medium">
                {format(monthDate, 'LLLL yyyy', { locale: ru })}
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((date, index) => (
                <div key={date ? getDayKey(date) : `empty-${index}`} className="text-center">
                  {date ? (
                    <button
                      type="button"
                      className={getDateClasses(date)}
                      onClick={() => handleDateClick(date)}
                      onMouseEnter={() => handleDateHover(date)}
                      disabled={isBefore(date, new Date())}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="w-10 h-10"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t flex items-center">
            <Clock className="h-4 w-4 mr-2 text-red-500" />
            <span className="mr-2">Время:</span>
            <Select 
              value={timeValue} 
              onValueChange={onTimeChange}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
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

  // Update parent component with date/time selections
  useEffect(() => {
    if (!selection.from) {
      onChange({ start: null, end: null });
      return;
    }

    const start = new Date(selection.from);
    start.setHours(parseInt(startTime, 10), 0, 0, 0);

    let end: Date | null = null;
    if (selection.to) {
      end = new Date(selection.to);
      end.setHours(parseInt(endTime, 10), 0, 0, 0);
    }

    onChange({ start, end });
  }, [selection, startTime, endTime, onChange]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-between items-center">
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-1"></div>
        
        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMonth(leftMonth, "Взять", startTime, setStartTime)}
        {renderMonth(rightMonth, "Вернуть", endTime, setEndTime)}
      </div>

      {selection.from && (
        <div className="p-4 border rounded-lg bg-blue-50">
          <h3 className="font-medium mb-2">Выбранный период:</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center">
              <span className="font-medium">Взять:</span> 
              <span className="ml-2">
                {format(selection.from, 'dd MMMM yyyy', { locale: ru })} в {startTime}:00
              </span>
            </div>
            
            {selection.to && (
              <div className="flex items-center">
                <span className="font-medium sm:ml-4">Вернуть:</span>
                <span className="ml-2">
                  {format(selection.to, 'dd MMMM yyyy', { locale: ru })} в {endTime}:00
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePickerRu;
