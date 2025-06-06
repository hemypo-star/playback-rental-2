
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingPeriod } from '@/types/product';
import { GroupedBooking } from '@/components/admin/bookings/types';
import { BookingWithProduct } from '@/components/admin/bookings/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RecentBookingsProps {
  bookings?: BookingWithProduct[];
  groupedBookings?: GroupedBooking[];
  isLoading: boolean;
}

export const RecentBookings = ({ bookings, groupedBookings, isLoading }: RecentBookingsProps) => {
  console.log('RecentBookings render:', {
    bookingsCount: bookings?.length || 0,
    groupedBookingsCount: groupedBookings?.length || 0,
    hasBookings: !!bookings,
    hasGroupedBookings: !!groupedBookings
  });

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

  const formatDate = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, 'dd MMM yyyy', { locale: ru });
  };

  // IMPROVED: Show both individual and grouped views with better labeling
  const showGroupedView = groupedBookings && groupedBookings.length > 0;
  const displayBookings = showGroupedView ? groupedBookings.slice(0, 5) : bookings?.slice(0, 5) || [];

  console.log('RecentBookings display decision:', {
    showGroupedView,
    displayBookingsCount: displayBookings.length,
    displayBookingStatuses: displayBookings.map(b => ({ id: b.id, status: b.status }))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние заявки</CardTitle>
        <CardDescription>
          {showGroupedView ? 'Последние 5 групповых заказов' : 'Последние 5 индивидуальных заявок'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayBookings.length > 0 ? (
          <div className="space-y-3">
            {displayBookings.map((booking) => {
              // Handle both grouped and individual bookings
              const isGrouped = 'items' in booking;
              const totalQuantity = isGrouped 
                ? booking.items.reduce((sum, item) => sum + item.quantity, 0)
                : (booking as BookingWithProduct).quantity || 1;
              const itemCount = isGrouped ? booking.items.length : 1;
              
              console.log('Rendering booking:', {
                id: booking.id,
                status: booking.status,
                isGrouped,
                totalPrice: booking.totalPrice
              });
              
              return (
                <div key={booking.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">{booking.customerName}</p>
                    <div className="text-sm text-muted-foreground flex flex-col">
                      <span>{booking.customerPhone}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span>{formatDate(booking.startDate)}</span>
                        {isGrouped && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {itemCount} товар{itemCount === 1 ? '' : itemCount < 5 ? 'а' : 'ов'}, {totalQuantity} шт.
                          </Badge>
                        )}
                        {!isGrouped && (booking as BookingWithProduct).product && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {(booking as BookingWithProduct).product?.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{booking.totalPrice?.toLocaleString() || '0'} ₽</p>
                    <Badge className={formatStatus(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">Нет заявок на бронирование</p>
        )}
      </CardContent>
    </Card>
  );
};
