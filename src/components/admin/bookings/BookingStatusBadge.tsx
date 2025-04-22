
import { Badge } from '@/components/ui/badge';
import { BookingPeriod } from '@/types/product';

interface BookingStatusBadgeProps {
  status: BookingPeriod['status'];
}

const statusLabels: Record<BookingPeriod['status'], string> = {
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  cancelled: 'Отменено',
  completed: 'Завершено'
};

export const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => {
  return (
    <Badge 
      variant={
        status === 'pending' ? 'secondary' 
        : status === 'confirmed' ? 'default'
        : status === 'cancelled' ? 'destructive'
        : 'outline'
      }
    >
      {statusLabels[status]}
    </Badge>
  );
};
