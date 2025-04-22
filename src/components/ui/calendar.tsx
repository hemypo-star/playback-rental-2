
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DayPickerProps, DayModifiers } from "react-day-picker";
import { ru } from 'date-fns/locale';

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  modifiersStyles,
  locale = ru,
  ...props
}: CalendarProps) {

  // Custom day renderer for pill-shaped range backgrounds
  const CustomDay = (dayProps: any) => {
    // Extract relevant props
    const { date, selected, modifiers, disabled, onSelect, onDayClick, onDayFocus } = dayProps;

    // Identify if this date matches any of the range modifiers
    const isStart = modifiers?.has('range_start');
    const isMiddle = modifiers?.has('range_middle');
    const isEnd = modifiers?.has('range_end');
    const isSelected = modifiers?.has('selected');
    const isToday = modifiers?.has('today');
    const isDisabled = modifiers?.has('disabled');
    const isOutside = modifiers?.has('outside');
    const isHidden = modifiers?.has('hidden');

    // Don't show if hidden
    if (isHidden) return null;

    // Compose backgrounds for each range type
    let backgroundDiv: JSX.Element | null = null;
    if (isStart) {
      backgroundDiv = (
        <div className="absolute inset-0 bg-red-500 rounded-l-full z-0" />
      );
    } else if (isEnd) {
      backgroundDiv = (
        <div className="absolute inset-0 bg-red-500 rounded-r-full z-0" />
      );
    } else if (isMiddle) {
      backgroundDiv = (
        <div className="absolute inset-0 bg-red-500 z-0" />
      );
    } 

    // Compose text styling
    let numberColor = "relative z-10";
    if (isStart || isMiddle || isEnd) {
      numberColor += " text-white";
    } else if (isDisabled || isOutside) {
      numberColor += " text-muted-foreground opacity-50";
    } else if (isToday) {
      numberColor += " text-accent-foreground";
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {backgroundDiv}
        <button
          type="button"
          tabIndex={isDisabled ? -1 : 0}
          disabled={isDisabled}
          aria-selected={isSelected}
          onClick={(e) => onDayClick?.(date, modifiers, e)}
          onFocus={(e) => onDayFocus?.(date, modifiers, e)}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-sm hover:bg-accent hover:text-accent-foreground transition-colors bg-transparent",
            // Remove background for selected/today
            isSelected ? "bg-transparent" : "",
            isToday ? "bg-transparent" : "",
          )}
          aria-label={date?.toDateString()}
        >
          <span className={numberColor}>
            {date?.getDate()}
          </span>
        </button>
      </div>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-3 w-full pointer-events-auto", className)}
      modifiersStyles={{
        // Remove any default background styling for selected/today from props or elsewhere
        day_selected: {},
        day_today: {},
        ...modifiersStyles,
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 transition-opacity"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative flex-1 focus-within:relative focus-within:z-20"
        ),
        day: "", // We handle all button styling custom in the renderer
        day_range_start: "",
        day_range_middle: "",
        day_range_end: "",
        day_selected: "",
        day_today: "",
        day_outside: "",
        day_disabled: "",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Day: CustomDay,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
