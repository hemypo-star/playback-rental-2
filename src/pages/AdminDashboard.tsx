
import { useQuery } from '@tanstack/react-query';
import { 
  ReceiptRussianRuble, 
  Package,
  Users,
  CalendarRange
} from 'lucide-react';
import { getProducts, getBookings } from '@/services/apiService';
import { BookingPeriod } from '@/types/product';
import { StatisticsCard } from '@/components/admin/dashboard/StatisticsCard';
import { RecentBookings } from '@/components/admin/dashboard/RecentBookings';
import { BookingStatistics } from '@/components/admin/dashboard/BookingStatistics';

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
  
  // Only count revenue from completed bookings
  const totalRevenue = bookings?.reduce(
    (sum: number, booking: BookingPeriod) => 
      booking.status === 'completed' ? sum + (booking.totalPrice || 0) : sum, 
    0
  ) || 0;

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
        <StatisticsCard
          title="Выручка"
          value={`${totalRevenue.toLocaleString()} ₽`}
          icon={ReceiptRussianRuble}
          trend={{ value: "+12.5%", isPositive: true, text: "с прошлого месяца" }}
        />
        <StatisticsCard
          title="Единиц техники"
          value={totalProducts}
          icon={Package}
          trend={{ value: "+3", isPositive: true, text: "новых единиц" }}
        />
        <StatisticsCard
          title="Всего заявок"
          value={totalBookings}
          icon={Users}
          trend={{ value: "-2%", isPositive: false, text: "с прошлой недели" }}
        />
        <StatisticsCard
          title="Активные брони"
          value={activeBookings}
          icon={CalendarRange}
          trend={{ value: "+2", isPositive: true, text: "текущие аренды" }}
        />
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-6">
        <RecentBookings bookings={bookings} isLoading={!bookings} />
        <BookingStatistics bookings={bookings} totalBookings={totalBookings} />
      </div>
    </div>
  );
};

export default AdminDashboard;
