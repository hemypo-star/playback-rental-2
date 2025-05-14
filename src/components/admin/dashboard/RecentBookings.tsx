
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingPeriod } from '@/types/product';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'Подтверждено';
      case 'pending': return 'В ожидании';
      case 'cancelled': return 'Отменено';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, 'dd MMM yyyy', { locale: ru });
  };

  const recentBookings = bookings?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние заявки</CardTitle>
        <CardDescription>
          Последние 5 заявок на бронирование
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <div className="text-sm text-muted-foreground flex flex-col">
                    <span>{booking.customerPhone}</span>
                    <span className="text-xs">{formatDate(booking.startDate)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{booking.totalPrice?.toLocaleString() || '0'} ₽</p>
                  <Badge className={formatStatus(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">Нет заявок на бронирование</p>
        )}
      </CardContent>
    </Card>
  );
};
