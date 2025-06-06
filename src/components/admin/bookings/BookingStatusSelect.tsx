
import { BookingWithProduct } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingPeriod } from "@/types/product";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { validateStatusUpdate } from "@/services/orderStatusService";
import { useToast } from "@/hooks/use-toast";
import React from "react";

type Props = {
  booking: BookingWithProduct;
  onStatusUpdate?: (id: string, status: BookingPeriod["status"]) => void;
  showAllOptions?: boolean; // NEW: Option to show all status options
};

const statusOptions: { value: BookingPeriod["status"]; label: string }[] = [
  { value: "pending", label: "Ожидание" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "cancelled", label: "Отменено" },
  { value: "completed", label: "Завершено" },
];

export const BookingStatusSelect: React.FC<Props> = ({ booking, onStatusUpdate, showAllOptions = false }) => {
  const [value, setValue] = React.useState<BookingPeriod["status"]>(booking.status);
  const { toast } = useToast();

  React.useEffect(() => {
    setValue(booking.status);
  }, [booking.status]);

  const handleChange = (next: BookingPeriod["status"]) => {
    // НОВАЯ ФУНКЦИЯ: Валидация перехода статуса (только если не показываем все опции)
    if (!showAllOptions) {
      const validation = validateStatusUpdate(booking.status, next);
      
      if (!validation.isValid) {
        toast({
          title: 'Недопустимый переход статуса',
          description: validation.reason,
          variant: 'destructive'
        });
        return;
      }
    }
    
    setValue(next);
    if (onStatusUpdate && next !== booking.status) {
      // УЛУЧШЕНИЕ: Показываем предупреждение для групповых операций
      if (booking.order_id) {
        const confirmed = confirm(
          `Это действие обновит статус для всех бронирований в заказе ${booking.order_id.slice(0, 8)}. Продолжить?`
        );
        
        if (!confirmed) {
          setValue(booking.status); // Возвращаем предыдущий статус
          return;
        }
      }
      
      onStatusUpdate(booking.id, next);
    }
  };

  // УЛУЧШЕНИЕ: Фильтруем доступные опции на основе текущего статуса (только если не показываем все опции)
  const getAvailableOptions = (currentStatus: BookingPeriod["status"]) => {
    if (showAllOptions) {
      return statusOptions; // Показываем все опции
    }

    const allowedTransitions: Record<BookingPeriod["status"], BookingPeriod["status"][]> = {
      'pending': ['pending', 'confirmed', 'cancelled'],
      'confirmed': ['confirmed', 'completed', 'cancelled'],
      'completed': ['completed'], // Завершенные заказы нельзя изменить
      'cancelled': ['cancelled', 'pending'] // Отмененные можно вернуть в ожидание
    };
    
    const allowed = allowedTransitions[currentStatus] || [];
    return statusOptions.filter(option => allowed.includes(option.value));
  };

  const availableOptions = getAvailableOptions(booking.status);

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <BookingStatusBadge status={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
