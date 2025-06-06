
import React from 'react';
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
import { groupBookingsByOrder } from '@/utils/bookingGroupingUtils';
import { BookingWithProduct } from '@/components/admin/bookings/types';

const AdminDashboard = () => {
  // Use unified cache keys to match AdminBookings
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => getProducts()
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'], // Changed from 'admin-bookings' to match AdminBookings
    queryFn: () => getBookings()
  });

  console.log('AdminDashboard - Raw bookings data:', bookings?.length || 0);
  console.log('AdminDashboard - Sample booking statuses:', bookings?.slice(0, 3).map(b => ({ id: b.id, status: b.status, price: b.totalPrice })));

  // Calculate statistics
  const totalProducts = products?.length || 0;
  const totalBookings = bookings?.length || 0;
  
  const activeBookings = bookings?.filter(
    (booking: BookingPeriod) => booking.status === 'confirmed' && new Date(booking.endDate) >= new Date()
  ).length || 0;
  
  // FIXED: Calculate revenue directly from individual bookings, not just grouped ones
  const completedBookings = bookings?.filter(
    (booking: BookingPeriod) => booking.status === 'completed'
  ) || [];
  
  console.log('AdminDashboard - Completed bookings:', completedBookings.length);
  console.log('AdminDashboard - Completed booking details:', completedBookings.map(b => ({ 
    id: b.id, 
    status: b.status, 
    price: b.totalPrice,
    customer: b.customerName 
  })));
  
  const totalRevenue = completedBookings.reduce(
    (sum, booking) => sum + (booking.totalPrice || 0), 
    0
  );
  
  console.log('AdminDashboard - Total revenue calculation:', {
    completedBookingsCount: completedBookings.length,
    totalRevenue: totalRevenue
  });

  // Create bookings with products for grouping (for display purposes only)
  const bookingsWithProducts: BookingWithProduct[] = React.useMemo(() => {
    if (!bookings || !products) return [];
    return bookings.map(booking => {
      const product = products.find(p => p.id === booking.productId);
      return { ...booking, product };
    });
  }, [bookings, products]);

  // Group bookings for display
  const groupedBookings = bookingsWithProducts ? groupBookingsByOrder(bookingsWithProducts) : [];

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
        <RecentBookings 
          bookings={bookingsWithProducts} 
          groupedBookings={groupedBookings} 
          isLoading={!bookings} 
        />
        <BookingStatistics bookings={bookings} totalBookings={totalBookings} />
      </div>
    </div>
  );
};

export default AdminDashboard;
