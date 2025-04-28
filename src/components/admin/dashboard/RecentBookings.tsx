
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingPeriod } from '@/types/product';

interface RecentBookingsProps {
  bookings: BookingPeriod[] | undefined;
  isLoading: boolean;
}

export const RecentBookings = ({ bookings, isLoading }: RecentBookingsProps) => {
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-400 text-black';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      default: return 'bg-gray-400 text-black';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние заявки</CardTitle>
        <CardDescription>
          Последние 5 заявок на бронирование
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!bookings ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-2">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{booking.totalPrice?.toLocaleString() || '0'} ₽</p>
                  <Badge className={formatStatus(booking.status)}>
                    {booking.status === 'confirmed' 
                      ? 'Подтверждено' 
                      : booking.status === 'pending' 
                      ? 'В ожидании'
                      : booking.status === 'cancelled'
                      ? 'Отменено'
                      : 'Завершено'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Нет заявок на бронирование</p>
        )}
      </CardContent>
    </Card>
  );
};
