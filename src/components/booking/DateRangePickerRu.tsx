import React from "react";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CalendarMonthColumn from "./DateRangePickerRu/CalendarMonthColumn";
import CalendarHeader from "./DateRangePickerRu/CalendarHeader";
import SelectedInfo from "./DateRangePickerRu/SelectedInfo";
import { useDateRangeCalendar } from "@/hooks/useDateRangeCalendar";
import { useIsMobile } from "@/hooks/use-mobile";
const HOURS = Array.from({
  length: 10
}, (_, i) => i + 10).map(hour => ({
  value: hour.toString(),
  label: (hour < 10 ? `0${hour}` : hour) + ":00"
}));
interface DateRangePickerRuProps {
  onChange: (range: {
    start: Date | null;
    end: Date | null;
  }) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  className?: string;
  onClose?: () => void;
}
const DateRangePickerRu = ({
  onChange,
  initialStartDate,
  initialEndDate,
  className,
  onClose
}: DateRangePickerRuProps) => {
  const isMobile = useIsMobile();
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
    getDayClasses,
    getDayKey,
    buildDaysGrid,
    setStartTime,
    setEndTime,
    getFormattedDateRange
  } = useDateRangeCalendar(initialStartDate, initialEndDate);
  const daysOfWeek = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(d => d.toUpperCase());
  const handleConfirmTime = () => {
    if (!selection.from) return;
    const dateRange = getFormattedDateRange();
    if (dateRange) {
      onChange(dateRange);

      // Force close popup with higher priority
      if (onClose) {
        // Use immediate close call and also a delayed call for reliability
        onClose();
        requestAnimationFrame(() => {
          onClose();
        });
      }
    }
  };
  return <div className={cn("w-full", className)}>
      <CalendarHeader onPrev={handlePrevMonth} onNext={handleNextMonth} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <div className="flex flex-col h-full">
          <CalendarMonthColumn label="Взять" monthDate={leftMonth} daysOfWeek={daysOfWeek} daysGrid={buildDaysGrid(leftMonth)} getDayKey={getDayKey} getDayClasses={getDayClasses} handleDateClick={handleDateClick} handleDateHover={handleDateHover} timeValue={startTime} setTime={setStartTime} hours={HOURS} isMobile={isMobile} />
        </div>
        
        {!isMobile ? <div className="flex flex-col h-full">
            <CalendarMonthColumn label="Вернуть" monthDate={rightMonth} daysOfWeek={daysOfWeek} daysGrid={buildDaysGrid(rightMonth)} getDayKey={getDayKey} getDayClasses={getDayClasses} handleDateClick={handleDateClick} handleDateHover={handleDateHover} timeValue={endTime} setTime={setEndTime} hours={HOURS} isMobile={isMobile} />
          </div> : <div className="flex flex-col h-full mt-0">
            <div className="pt-2 flex items-center gap-2 self-start py-[4px] my-[-15px]">
              <Clock className="h-4 w-4 text-[#ea384c]" />
              <span className="text-sm text-[#222]">
                Вернуть до:
              </span>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="w-[100px] bg-white border rounded px-2 py-1 h-8">
                  <SelectValue placeholder="Выберите время" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(hour => <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>}
      </div>

      <div className="flex justify-center mt-6">
        <Button variant="outline" size="sm" onClick={handleConfirmTime} className="text-[#ea384c] border-[#ea384c] hover:bg-[#ea384c] hover:text-white w-full max-w-xs py-[20px]">
          Подтвердить время
        </Button>
      </div>

      <SelectedInfo from={selection.from} to={selection.to} startTime={startTime} endTime={endTime} />
    </div>;
};
export default DateRangePickerRu;