
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookingPeriod } from '@/types/product';

interface BookingStatisticsProps {
  bookings: BookingPeriod[] | undefined;
  totalBookings: number;
}

export const BookingStatistics = ({ bookings, totalBookings }: BookingStatisticsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика бронирований</CardTitle>
        <CardDescription>
          Распределение бронирований по статусам
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {bookings ? (
          <div className="w-full h-40 flex items-end justify-around">
            {['confirmed', 'pending', 'cancelled', 'completed'].map((status) => {
              const count = bookings.filter((b) => b.status === status).length;
              const percent = totalBookings > 0 ? (count / totalBookings) * 100 : 0;
              
              return (
                <div key={status} className="flex flex-col items-center">
                  <div 
                    className={`w-12 mb-2 ${
                      status === 'confirmed' 
                        ? 'bg-green-500' 
                        : status === 'pending' 
                        ? 'bg-yellow-400'
                        : status === 'cancelled'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ height: `${Math.max(percent, 5)}%` }}
                  ></div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {status === 'confirmed' 
                      ? 'Подтверждено' 
                      : status === 'pending' 
                      ? 'В ожидании'
                      : status === 'cancelled'
                      ? 'Отменено'
                      : 'Завершено'}
                  </div>
                  <div className="text-sm font-medium">{count}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
