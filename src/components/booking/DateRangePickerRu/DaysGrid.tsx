
import React from "react";
import { cn } from "@/lib/utils";

interface DaysGridProps {
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
  currentMonth: number;
}

const DaysGrid = ({
  daysGrid,
  getDayKey,
  getDayClasses,
  handleDateClick,
  handleDateHover,
  currentMonth,
}: DaysGridProps) => (
  <div className="grid grid-cols-7 gap-y-1 gap-x-0 w-full mb-2">
    {daysGrid.map((d, idx) =>
      d ? (
        <button
          key={getDayKey(d)}
          type="button"
          className={cn(
            getDayClasses(d, currentMonth).base,
            getDayClasses(d, currentMonth).disabled,
            getDayClasses(d, currentMonth).selected,
            getDayClasses(d, currentMonth).range,
            getDayClasses(d, currentMonth).rounded,
            getDayClasses(d, currentMonth).today,
            getDayClasses(d, currentMonth).hover,
            getDayClasses(d, currentMonth).unavailable
          )}
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
);

export default DaysGrid;
