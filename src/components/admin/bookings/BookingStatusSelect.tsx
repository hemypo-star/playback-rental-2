
import { BookingWithProduct } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingPeriod } from "@/types/product";
import { BookingStatusBadge } from "./BookingStatusBadge";
import React from "react";

type Props = {
  booking: BookingWithProduct;
  onStatusUpdate?: (id: string, status: BookingPeriod["status"]) => void;
};

const statusOptions: { value: BookingPeriod["status"]; label: string }[] = [
  { value: "pending", label: "Ожидание" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "cancelled", label: "Отменено" },
  { value: "completed", label: "Завершено" },
];

export const BookingStatusSelect: React.FC<Props> = ({ booking, onStatusUpdate }) => {
  const [value, setValue] = React.useState<BookingPeriod["status"]>(booking.status);

  React.useEffect(() => {
    setValue(booking.status);
  }, [booking.status]);

  const handleChange = (next: BookingPeriod["status"]) => {
    setValue(next);
    if (onStatusUpdate && next !== booking.status) {
      onStatusUpdate(booking.id, next);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <BookingStatusBadge status={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
