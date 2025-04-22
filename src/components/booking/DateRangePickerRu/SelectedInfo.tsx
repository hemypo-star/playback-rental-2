
import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SelectedInfoProps {
  from: Date | null;
  to: Date | null;
  startTime: string;
  endTime: string;
}

const SelectedInfo = ({ from, to, startTime, endTime }: SelectedInfoProps) => {
  if (!from) return null;

  // Если начало и конец совпадают по дате — показать оба времени
  const oneDay = !to || (from && to && from.getTime() === to.getTime());

  return (
    <div className="p-4 mt-4 rounded-lg bg-[#F9FAFB] border text-[#1B1F3B]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center">
          <span className="font-medium">Взять:</span>
          <span className="ml-2">
            {format(from, "dd MMMM yyyy", { locale: ru })} в {startTime.padStart(2, "0")}:00
          </span>
        </div>
        {oneDay ? (
          <div className="flex items-center">
            <span className="font-medium sm:ml-4">Вернуть:</span>
            <span className="ml-2">{endTime.padStart(2, "0")}:00</span>
          </div>
        ) : (
          to && (
          <div className="flex items-center">
            <span className="font-medium sm:ml-4">Вернуть:</span>
            <span className="ml-2">
              {format(to, "dd MMMM yyyy", { locale: ru })} в {endTime.padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedInfo;
