
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarHeaderProps {
  onPrev: () => void;
  onNext: () => void;
}

const CalendarHeader = ({ onPrev, onNext }: CalendarHeaderProps) => (
  <div className="flex items-center justify-between border-b pb-2 mb-5">
    <span className="font-medium text-base text-[#222]">Взять / Вернуть</span>
    <div className="flex gap-3">
      <button
        onClick={onPrev}
        className="p-2 rounded-full hover:bg-[#F2F2FA]"
        aria-label="Предыдущий месяц"
        type="button"
      >
        <ChevronLeft className="h-5 w-5 text-[#222]" />
      </button>
      <button
        onClick={onNext}
        className="p-2 rounded-full hover:bg-[#F2F2FA]"
        aria-label="Следующий месяц"
        type="button"
      >
        <ChevronRight className="h-5 w-5 text-[#222]" />
      </button>
    </div>
  </div>
);

export default CalendarHeader;
