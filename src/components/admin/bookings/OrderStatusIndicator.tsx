
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { BookingWithProduct } from './types';
import { validateOrderStatusConsistency } from '@/utils/bookingGroupingUtils';

interface OrderStatusIndicatorProps {
  booking: BookingWithProduct;
  allBookings: BookingWithProduct[];
}

export const OrderStatusIndicator: React.FC<OrderStatusIndicatorProps> = ({ 
  booking, 
  allBookings 
}) => {
  if (!booking.order_id) {
    return null; // Не показываем индикатор для отдельных бронирований
  }
  
  const validation = validateOrderStatusConsistency(allBookings, booking.order_id);
  
  if (validation.isConsistent) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <Badge variant="outline" className="text-xs text-green-600 border-green-200">
          Синхронизировано
        </Badge>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3 text-orange-500" />
      <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
        Требует синхронизации
      </Badge>
      <div className="text-xs text-muted-foreground">
        Статусы: {validation.statuses.join(', ')}
      </div>
    </div>
  );
};
