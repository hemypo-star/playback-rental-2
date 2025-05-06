
import { useState } from "react";
import {
  addMonths,
  isBefore,
  isAfter,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  format,
} from "date-fns";

export interface DateSelection {
  from: Date | null;
  to: Date | null;
}

export function useDateRangeCalendar(initialStartDate?: Date, initialEndDate?: Date) {
  const [leftMonth, setLeftMonth] = useState<Date>(
    initialStartDate
      ? startOfMonth(initialStartDate)
      : startOfMonth(new Date())
  );
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(leftMonth, 1));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selection, setSelection] = useState<DateSelection>({
    from: initialStartDate || null,
    to: initialEndDate || null,
  });
  const [startTime, setStartTime] = useState<string>(
    initialStartDate ? initialStartDate.getHours().toString() : "10"
  );
  const [endTime, setEndTime] = useState<string>(
    initialEndDate ? initialEndDate.getHours().toString() : "10"
  );

  const handlePrevMonth = () => {
    setLeftMonth((prev) => {
      const newLeft = addMonths(prev, -1);
      setRightMonth(addMonths(newLeft, 1));
      return newLeft;
    });
  };
  
  const handleNextMonth = () => {
    setRightMonth((prev) => {
      const newRight = addMonths(prev, 1);
      setLeftMonth(addMonths(newRight, -1));
      return newRight;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelection((prev) => {
      if (!prev.from || (prev.from && prev.to)) return { from: date, to: null };
      if (prev.from && !prev.to) {
        if (isSameDay(date, prev.from)) return { from: null, to: null };
        if (isBefore(date, prev.from)) return { from: date, to: prev.from };
        return { from: prev.from, to: date };
      }
      return prev;
    });
  };
  
  const handleDateHover = (date: Date | null) => setHoverDate(date);

  const getDayClasses = (date: Date, currentMonth: number): {
    base: string;
    disabled: string | false;
    selected: string | false;
    range: string | false;
    rounded: string | false;
    today: string | false;
    hover: string | false;
    unavailable: string | false;
  } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const disabled = isBefore(date, today) && !isSameDay(date, today);
    
    // For days outside the current month, return object with appropriate classes
    if (date.getMonth() !== currentMonth) {
      return {
        base: "w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors duration-100 select-none invisible pointer-events-none",
        disabled: false,
        selected: false,
        range: false,
        rounded: false,
        today: false,
        hover: false,
        unavailable: false
      };
    }
    
    const isToday = isSameDay(date, today);
    const isStart = selection.from && isSameDay(date, selection.from);
    const isEnd = selection.to && isSameDay(date, selection.to);

    let isInRange = false;
    let isInHover = false;
    
    if (selection.from && selection.to) {
      isInRange = isWithinInterval(date, {
        start: selection.from,
        end: selection.to,
      });
    } else if (selection.from && hoverDate && isAfter(hoverDate, selection.from)) {
      isInHover = isWithinInterval(date, {
        start: selection.from,
        end: hoverDate,
      });
    }

    const roundedLeft = isStart ? "rounded-l-full" : "";
    const roundedRight = isEnd ? "rounded-r-full" : "";

    return {
      base: "w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors duration-100 select-none",
      disabled: disabled ? "opacity-40 pointer-events-none" : false,
      selected: (isStart || isEnd) ? "bg-[#1B1F3B] text-white z-10" : false,
      range: (isInRange || isInHover) && !isStart && !isEnd ? "bg-[#F2F2FA] text-[#222]" : false,
      rounded: (isStart || isEnd) ? (roundedLeft || roundedRight) : false,
      today: isToday ? "border border-[#ea384c]" : false,
      hover: !isStart && !isEnd && !isInRange && !isInHover && !disabled ? "hover:bg-[#F2F2FA]" : false,
      unavailable: false // Add the missing property
    };
  };

  const buildDaysGrid = (monthDate: Date) => {
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    let firstJS = firstOfMonth.getDay();
    firstJS = firstJS === 0 ? 7 : firstJS;
    const daysGrid: (Date | null)[] = [];
    for (let i = 1; i < firstJS; i++) daysGrid.push(null);
    for (let day = 1; day <= lastOfMonth.getDate(); day++)
      daysGrid.push(new Date(year, month, day));
    return daysGrid;
  };

  const getDateWithTime = (date: Date | null, timeString: string): Date | null => {
    if (!date) return null;
    const newDate = new Date(date);
    newDate.setHours(parseInt(timeString, 10), 0, 0, 0);
    return newDate;
  };

  const getFormattedDateRange = () => {
    if (!selection.from) return null;

    const start = getDateWithTime(selection.from, startTime);
    let end = selection.to 
      ? getDateWithTime(selection.to, endTime)
      : getDateWithTime(selection.from, endTime);

    return { start, end };
  };

  const getDayKey = (date: Date) => format(date, "yyyy-MM-dd");

  return {
    leftMonth,
    rightMonth,
    selection,
    startTime,
    endTime,
    handlePrevMonth,
    handleNextMonth,
    handleDateClick,
    handleDateHover,
    getDayClasses,
    getDayKey,
    buildDaysGrid,
    setStartTime,
    setEndTime,
    getFormattedDateRange,
  };
}
