
import { useQuery } from '@tanstack/react-query';
import { 
  ReceiptRussianRuble, 
  ArrowUpRight, 
  ArrowDownRight, 
  CalendarRange,
  Package,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProducts, getBookings } from '@/services/apiService';
import { BookingPeriod } from '@/types/product';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => getProducts()
  });

  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => getBookings()
  });

  // Calculate statistics
  const totalProducts = products?.length || 0;
  const totalBookings = bookings?.length || 0;
  
  const activeBookings = bookings?.filter(
    (booking: BookingPeriod) => booking.status === 'confirmed' && new Date(booking.endDate) >= new Date()
  ).length || 0;
  
  // Count only confirmed bookings for revenue
  const totalRevenue = bookings?.reduce(
    (sum: number, booking: BookingPeriod) => 
      booking.status === 'confirmed' ? sum + (booking.totalPrice || 0) : sum, 
    0
  ) || 0;

  // Format booking status with correct colors
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-400 text-black';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'completed':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-400 text-black';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-muted-foreground">
            Обзор статистики проката и последних заявок
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <ReceiptRussianRuble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} ₽</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +12.5%
              </span>{' '}
              с прошлого месяца
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Единиц техники</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +3
              </span>{' '}
              новых единиц
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3" />
                -2%
              </span>{' '}
              с прошлой недели
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Активные брони</CardTitle>
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +2
              </span>{' '}
              текущие аренды
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Последние заявки</CardTitle>
            <CardDescription>
              Последние 5 заявок на бронирование
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings ? (
              bookings.length > 0 ? (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map((booking: BookingPeriod) => (
                    <div key={booking.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{booking.totalPrice ? booking.totalPrice.toLocaleString() : '0'} ₽</p>
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
              )
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
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
                  const count = bookings.filter((b: BookingPeriod) => b.status === status).length;
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
      </div>
    </div>
  );
};

export default AdminDashboard;
