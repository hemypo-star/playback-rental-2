
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookingPeriod } from '@/types/product';
import { StatusBarChart } from './StatusBarChart';

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
          <StatusBarChart bookings={bookings} totalBookings={totalBookings} />
        ) : (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
