
import React, { useState, useEffect } from 'react';
import { ru } from 'date-fns/locale';
import { format, addMonths, isBefore, isAfter, isSameDay, isWithinInterval, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Часы: 10—19, шаг 1 час, формат 24ч
const HOURS = Array.from({ length: 10 }, (_, i) => i + 10).map(hour => ({
  value: hour.toString(),
  label: (hour < 10 ? `0${hour}` : hour) + ':00'
}));

interface DateRangePickerRuProps {
  onChange: (range: {
    start: Date | null;
    end: Date | null;
  }) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  className?: string;
}

const DateRangePickerRu = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className
}: DateRangePickerRuProps) => {
  const [leftMonth, setLeftMonth] = useState<Date>(initialStartDate ? startOfMonth(initialStartDate) : startOfMonth(new Date()));
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(leftMonth, 1));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selection, setSelection] = useState<{from: Date | null; to: Date | null;}>({
    from: initialStartDate || null,
    to: initialEndDate || null
  });
  const [startTime, setStartTime] = useState<string>(initialStartDate ? initialStartDate.getHours().toString() : "10");
  const [endTime, setEndTime] = useState<string>(initialEndDate ? initialEndDate.getHours().toString() : "10");

  // calc days of week RU
  const daysOfWeek = ['пн','вт','ср','чт','пт','сб','вс'].map(d => d.toUpperCase());

  // calendar navigation
  const handlePrevMonth = () => {
    setLeftMonth(prev => {
      const newLeft = addMonths(prev, -1);
      setRightMonth(addMonths(newLeft, 1));
      return newLeft;
    });
  };
  const handleNextMonth = () => {
    setRightMonth(prev => {
      const newRight = addMonths(prev, 1);
      setLeftMonth(addMonths(newRight, -1));
      return newRight;
    });
  };

  // date selection logic
  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date())) return;
    setSelection(prev => {
      // Start new selection unconditionally if none/complete
      if (!prev.from || (prev.from && prev.to)) return { from: date, to: null };
      if (prev.from && !prev.to) {
        if (isSameDay(date, prev.from)) return { from: null, to: null };
        if (isBefore(date, prev.from)) return { from: date, to: prev.from };
        return { from: prev.from, to: date };
      }
      return prev;
    });
  };

  const handleDateHover = (date: Date|null) => setHoverDate(date);

  // classes for each day cell
  const getDayClasses = (date: Date, currentMonth: number) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const disabled = isBefore(date, today);
    if (date.getMonth() !== currentMonth) return "invisible pointer-events-none"; // hide out-of-month
    const isToday = isSameDay(date, today);
    const isStart = selection.from && isSameDay(date, selection.from);
    const isEnd = selection.to && isSameDay(date, selection.to);

    // fill for selected range or hover
    let isInRange = false, isInHover = false;
    if (selection.from && selection.to) {
      isInRange = isWithinInterval(date, {start: selection.from, end: selection.to});
    } else if (selection.from && hoverDate && isAfter(hoverDate, selection.from)) {
      isInHover = isWithinInterval(date, {start: selection.from, end: hoverDate});
    }

    // corners for range
    const roundedLeft = (isStart) ? 'rounded-l-full' : '';
    const roundedRight = (isEnd) ? 'rounded-r-full' : '';
    return cn(
      "w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors duration-100 select-none",
      disabled && "opacity-40 pointer-events-none",
      (isStart || isEnd) && "bg-[#1B1F3B] text-white z-10", // selected start/end: dark blue with white number
      (isInRange || isInHover) && !isStart && !isEnd && "bg-[#F2F2FA] text-[#222]", // range fill
      (isStart || isEnd) && (roundedLeft || roundedRight),
      isToday && "border border-[#ea384c]", // today: thin red border
      !isStart && !isEnd && !isInRange && !isInHover && !disabled && "hover:bg-[#F2F2FA]",
    );
  };

  // get a YYYY-MM-DD string for key
  const getDayKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const renderMonth = (monthDate: Date, label: string, timeValue: string, setTime: (val:string) => void) => {
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    // firstDayOfWeek: 1=Mon (RU); JS getDay(): 0=Sun, so 1=Mon, ... 0=Sun
    let firstJS = firstOfMonth.getDay();
    firstJS = firstJS === 0 ? 7 : firstJS;
    const daysGrid = [];
    for (let i=1; i<firstJS; i++) daysGrid.push(null); // pad blanks
    for (let day=1; day<=lastOfMonth.getDate(); day++) daysGrid.push(new Date(year, month, day));

    return (
      <div className="flex flex-col items-center">
        <h3 className="font-medium text-lg text-[#222] text-center mb-3">{format(monthDate, 'LLLL yyyy', {locale: ru})}</h3>
        <div className="grid grid-cols-7 gap-y-2 gap-x-0 mb-2 w-full">
          {daysOfWeek.map((d,i) => (
            <span key={d+i} className="text-xs font-medium text-[#B1B1C7] text-center">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-0 w-full mb-2">
          {daysGrid.map((d, idx) =>
            d ? (
              <button
                key={getDayKey(d)}
                type="button"
                className={getDayClasses(d, month)}
                onClick={() => handleDateClick(d)}
                onMouseEnter={() => handleDateHover(d)}
                onFocus={() => handleDateHover(d)}
                onMouseLeave={() => handleDateHover(null)}
                onBlur={() => handleDateHover(null)}
              >
                {d.getDate()}
              </button>
            ) : (
              <span key={`empty${idx}`} className="w-10 h-10"/>
            )
          )}
        </div>
        {/* Time select below calendar */}
        <div className="mt-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#ea384c]" />
          <span className="text-sm text-[#222]">Время:</span>
          <Select
            value={timeValue}
            onValueChange={setTime}
          >
            <SelectTrigger className="w-[100px] bg-white border rounded px-2 py-1 h-8">
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
    )
  };

  // Emit selected dates/times upwards
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

  // Responsive: stack on mobile
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between border-b pb-2 mb-5">
        <span className="font-medium text-base text-[#222]">Взять / Вернуть</span>
        <div className="flex gap-3">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-[#F2F2FA]" aria-label="Предыдущий месяц">
            <ChevronLeft className="h-5 w-5 text-[#222]" />
          </button>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-[#F2F2FA]" aria-label="Следующий месяц">
            <ChevronRight className="h-5 w-5 text-[#222]" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        {/* Left month: "Взять" */}
        <div>
          {renderMonth(leftMonth, "Взять", startTime, setStartTime)}
        </div>
        {/* Right month: "Вернуть" */}
        <div>
          {renderMonth(rightMonth, "Вернуть", endTime, setEndTime)}
        </div>
      </div>
      {selection.from && (
        <div className="p-4 mt-4 rounded-lg bg-[#F9FAFB] border text-[#1B1F3B]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center">
              <span className="font-medium">Взять:</span>
              <span className="ml-2">
                {format(selection.from, 'dd MMMM yyyy', { locale: ru })} в {startTime.padStart(2, '0')}:00
              </span>
            </div>
            {selection.to && (
              <div className="flex items-center">
                <span className="font-medium sm:ml-4">Вернуть:</span>
                <span className="ml-2">
                  {format(selection.to, 'dd MMMM yyyy', { locale: ru })} в {endTime.padStart(2, '0')}:00
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
