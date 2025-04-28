
import { BookingPeriod } from '@/types/product';

interface StatusBarChartProps {
  bookings: BookingPeriod[];
  totalBookings: number;
}

export const StatusBarChart = ({ bookings, totalBookings }: StatusBarChartProps) => {
  const statusTranslations = {
    confirmed: 'Подтверждено',
    pending: 'В ожидании',
    cancelled: 'Отменено',
    completed: 'Завершено'
  };

  const statusColors = {
    confirmed: 'bg-green-500',
    pending: 'bg-yellow-400', 
    cancelled: 'bg-red-500',
    completed: 'bg-blue-500'
  };

  return (
    <div className="w-full h-40 flex items-end justify-around">
      {['confirmed', 'pending', 'cancelled', 'completed'].map((status) => {
        const count = bookings.filter((b) => b.status === status).length;
        const percent = totalBookings > 0 ? (count / totalBookings) * 100 : 0;
        
        return (
          <div key={status} className="flex flex-col items-center">
            <div 
              className={`w-12 mb-2 ${statusColors[status as keyof typeof statusColors]}`}
              style={{ height: `${Math.max(percent, 5)}%` }}
            ></div>
            <div className="text-xs text-muted-foreground capitalize">
              {statusTranslations[status as keyof typeof statusTranslations]}
            </div>
            <div className="text-sm font-medium">{count}</div>
          </div>
        );
      })}
    </div>
  );
};
