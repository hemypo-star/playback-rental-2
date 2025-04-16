
import { Badge } from '@/components/ui/badge';
import { BookingPeriod } from '@/types/product';

interface BookingStatusBadgeProps {
  status: BookingPeriod['status'];
}

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
      {status}
    </Badge>
  );
};
