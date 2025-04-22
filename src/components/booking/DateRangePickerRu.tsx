
import React, { useState, useEffect } from "react";
import { ru } from "date-fns/locale";
import {
  format,
  addMonths,
  isBefore,
  isAfter,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CalendarMonthColumn from "./DateRangePickerRu/CalendarMonthColumn";

// Часы: 10—19, шаг 1 час, формат 24ч
const HOURS = Array.from({ length: 10 }, (_, i) => i + 10).map((hour) => ({
  value: hour.toString(),
  label: (hour < 10 ? `0${hour}` : hour) + ":00",
}));

interface DateRangePickerRuProps {
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  className?: string;
}

const DateRangePickerRu = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className,
}: DateRangePickerRuProps) => {
  const [leftMonth, setLeftMonth] = useState<Date>(
    initialStartDate
      ? startOfMonth(initialStartDate)
      : startOfMonth(new Date())
  );
  const [rightMonth, setRightMonth] = useState<Date>(addMonths(leftMonth, 1));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selection, setSelection] = useState<{ from: Date | null; to: Date | null }>({
    from: initialStartDate || null,
    to: initialEndDate || null,
  });
  const [startTime, setStartTime] = useState<string>(
    initialStartDate ? initialStartDate.getHours().toString() : "10"
  );
  const [endTime, setEndTime] = useState<string>(
    initialEndDate ? initialEndDate.getHours().toString() : "10"
  );

  // RU days of week
  const daysOfWeek = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) =>
    d.toUpperCase()
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

  // Выбор даты: разрешаем выбирать сегодня (isBefore check — только до сегодня)
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

  const getDayClasses = (date: Date, currentMonth: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const disabled = isBefore(date, today) && !isSameDay(date, today);
    if (date.getMonth() !== currentMonth)
      return "invisible pointer-events-none";
    const isToday = isSameDay(date, today);
    const isStart = selection.from && isSameDay(date, selection.from);
    const isEnd = selection.to && isSameDay(date, selection.to);

    let isInRange = false,
      isInHover = false;
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

    return cn(
      "w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors duration-100 select-none",
      disabled && "opacity-40 pointer-events-none",
      (isStart || isEnd) && "bg-[#1B1F3B] text-white z-10",
      (isInRange || isInHover) && !isStart && !isEnd && "bg-[#F2F2FA] text-[#222]",
      (isStart || isEnd) && (roundedLeft || roundedRight),
      isToday && "border border-[#ea384c]",
      !isStart && !isEnd && !isInRange && !isInHover && !disabled && "hover:bg-[#F2F2FA]"
    );
  };

  const getDayKey = (date: Date) => format(date, "yyyy-MM-dd");

  // Create grid for month
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

  // Emit changes up
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
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between border-b pb-2 mb-5">
        <span className="font-medium text-base text-[#222]">Взять / Вернуть</span>
        <div className="flex gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-[#F2F2FA]"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-5 w-5 text-[#222]" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-[#F2F2FA]"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-5 w-5 text-[#222]" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        {/* Left month: "Взять" */}
        <div>
          <CalendarMonthColumn
            label="Взять"
            monthDate={leftMonth}
            daysOfWeek={daysOfWeek}
            daysGrid={buildDaysGrid(leftMonth)}
            getDayKey={getDayKey}
            getDayClasses={getDayClasses}
            handleDateClick={handleDateClick}
            handleDateHover={handleDateHover}
            timeValue={startTime}
            setTime={setStartTime}
            hours={HOURS}
          />
        </div>
        {/* Right month: "Вернуть" */}
        <div>
          <CalendarMonthColumn
            label="Вернуть"
            monthDate={rightMonth}
            daysOfWeek={daysOfWeek}
            daysGrid={buildDaysGrid(rightMonth)}
            getDayKey={getDayKey}
            getDayClasses={getDayClasses}
            handleDateClick={handleDateClick}
            handleDateHover={handleDateHover}
            timeValue={endTime}
            setTime={setEndTime}
            hours={HOURS}
          />
        </div>
      </div>
      {selection.from && (
        <div className="p-4 mt-4 rounded-lg bg-[#F9FAFB] border text-[#1B1F3B]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center">
              <span className="font-medium">Взять:</span>
              <span className="ml-2">
                {format(selection.from, "dd MMMM yyyy", { locale: ru })} в{" "}
                {startTime.padStart(2, "0")}:00
              </span>
            </div>
            {selection.to && (
              <div className="flex items-center">
                <span className="font-medium sm:ml-4">Вернуть:</span>
                <span className="ml-2">
                  {format(selection.to, "dd MMMM yyyy", { locale: ru })} в{" "}
                  {endTime.padStart(2, "0")}:00
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
