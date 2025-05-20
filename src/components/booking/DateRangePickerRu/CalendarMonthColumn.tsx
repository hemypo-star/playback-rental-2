
import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DaysGrid from "./DaysGrid";
import { useIsMobile } from "@/hooks/use-mobile";
type TimeOption = {
  value: string;
  label: string;
};
interface CalendarMonthColumnProps {
  label: string;
  monthDate: Date;
  daysOfWeek: string[];
  daysGrid: (Date | null)[];
  getDayKey: (d: Date) => string;
  getDayClasses: (d: Date, currentMonth: number) => {
    base: string;
    disabled: string | false;
    selected: string | false;
    range: string | false;
    rounded: string | false;
    today: string | false;
    hover: string | false;
    unavailable: string | false;
  };
  handleDateClick: (d: Date) => void;
  handleDateHover: (d: Date | null) => void;
  timeValue: string;
  setTime: (v: string) => void;
  hours: TimeOption[];
}
const CalendarMonthColumn = ({
  label,
  monthDate,
  daysOfWeek,
  daysGrid,
  getDayKey,
  getDayClasses,
  handleDateClick,
  handleDateHover,
  timeValue,
  setTime,
  hours
}: CalendarMonthColumnProps) => {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const isMobile = useIsMobile();
  return <div className="flex flex-col items-center h-full">
      <h3 className="font-medium text-lg text-[#222] text-center mb-3">
        {format(monthDate, "LLLL yyyy", {
        locale: ru
      })}
      </h3>
      <div className="grid grid-cols-7 gap-y-2 gap-x-0 mb-2 w-full">
        {daysOfWeek.map((d, i) => <span key={d + i} className="text-xs font-medium text-[#B1B1C7] text-center">
            {d}
          </span>)}
      </div>
      <div className="flex-grow w-full">
        <DaysGrid daysGrid={daysGrid} getDayKey={getDayKey} getDayClasses={getDayClasses} handleDateClick={handleDateClick} handleDateHover={handleDateHover} currentMonth={month} />
      </div>
      {/* Hide time selector for "Вернуть" in mobile mode since we've added it separately */}
      {!(isMobile && label === "Вернуть") && <div className="pt-2 flex items-center gap-2 self-start py-[4px]">
          <Clock className="h-4 w-4 text-[#ea384c]" />
          <span className="text-sm text-[#222] text-sec">
            {label === "Взять" ? "Взять в:" : "Вернуть до:"}
          </span>
          <Select value={timeValue} onValueChange={setTime}>
            <SelectTrigger className="w-[100px] bg-white border rounded px-2 py-1 h-8">
              <SelectValue placeholder="Выберите время" />
            </SelectTrigger>
            <SelectContent>
              {hours.map(hour => <SelectItem key={hour.value} value={hour.value}>
                  {hour.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>}
    </div>;
};
export default CalendarMonthColumn;
