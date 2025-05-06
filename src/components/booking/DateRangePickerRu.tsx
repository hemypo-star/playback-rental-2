
import React from "react";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CalendarMonthColumn from "./DateRangePickerRu/CalendarMonthColumn";
import CalendarHeader from "./DateRangePickerRu/CalendarHeader";
import SelectedInfo from "./DateRangePickerRu/SelectedInfo";
import { useDateRangeCalendar } from "@/hooks/useDateRangeCalendar";
import { BookingPeriod } from "@/types/product";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 10).map((hour) => ({
  value: hour.toString(),
  label: (hour < 10 ? `0${hour}` : hour) + ":00",
}));

interface DateRangePickerRuProps {
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  className?: string;
  onClose?: () => void;
  isDateUnavailable?: (date: Date) => boolean;
  bookedPeriods?: BookingPeriod[];
}

const DateRangePickerRu = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className,
  onClose,
  isDateUnavailable,
  bookedPeriods = [],
}: DateRangePickerRuProps) => {
  const {
    leftMonth,
    rightMonth,
    selection,
    startTime,
    endTime,
    handlePrevMonth,
    handleNextMonth,
    handleDateClick,
    handleDateHover,
    getDayClasses: getBaseDayClasses,
    getDayKey,
    buildDaysGrid,
    setStartTime,
    setEndTime,
    getFormattedDateRange,
  } = useDateRangeCalendar(initialStartDate, initialEndDate);

  // Extend the day classes with the unavailable style
  const getDayClasses = (date: Date, currentMonth: number) => {
    const baseClasses = getBaseDayClasses(date, currentMonth);
    
    // Check if the date is unavailable
    const isUnavailable = isDateUnavailable ? isDateUnavailable(date) : false;
    
    return {
      ...baseClasses,
      // Return string or false, never a boolean true
      unavailable: isUnavailable ? 'bg-red-100 hover:bg-red-200 text-red-800' : false,
    };
  };

  const daysOfWeek = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) =>
    d.toUpperCase()
  );

  const handleConfirmTime = () => {
    if (!selection.from) return;
    
    const dateRange = getFormattedDateRange();
    if (dateRange) {
      onChange(dateRange);
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <CalendarHeader onPrev={handlePrevMonth} onNext={handleNextMonth} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
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

      <div className="flex justify-center mt-6">
        <Button 
          variant="outline" 
          size="sm"
          className="text-[#ea384c] border-[#ea384c] hover:bg-[#ea384c] hover:text-white"
          onClick={handleConfirmTime}
        >
          Подтвердить время
        </Button>
      </div>

      <SelectedInfo
        from={selection.from}
        to={selection.to}
        startTime={startTime}
        endTime={endTime}
      />
    </div>
  );
};

export default DateRangePickerRu;
