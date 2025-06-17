
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
  // UNIFIED: Use same cache keys as AdminBookings
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => getProducts()
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'], // UNIFIED: Now matches AdminBookings cache key
    queryFn: () => getBookings()
  });

  console.log('AdminDashboard - Raw bookings data:', bookings?.length || 0);
  console.log('AdminDashboard - Sample booking statuses:', bookings?.slice(0, 3).map(b => ({ id: b.id, status: b.status, price: b.totalPrice, order_id: b.order_id })));

  // Calculate statistics
  const totalProducts = products?.length || 0;
  const totalBookings = bookings?.length || 0;
  
  const activeBookings = bookings?.filter(
    (booking: BookingPeriod) => booking.status === 'confirmed' && new Date(booking.endDate) >= new Date()
  ).length || 0;
  
  // IMPROVED: Calculate revenue using order-based grouping for accuracy
  const bookingsWithProducts: BookingWithProduct[] = React.useMemo(() => {
    if (!bookings || !products) return [];
    return bookings.map(booking => {
      const product = products.find(p => p.id === booking.productId);
      return { ...booking, product };
    });
  }, [bookings, products]);

  // Group bookings by order to get accurate revenue per order
  const groupedBookings = bookingsWithProducts ? groupBookingsByOrder(bookingsWithProducts) : [];
  
  // Calculate revenue from completed orders (not individual bookings)
  const completedOrders = groupedBookings.filter(
    order => order.status === 'completed'
  );
  
  console.log('AdminDashboard - Completed orders:', completedOrders.length);
  console.log('AdminDashboard - Completed order details:', completedOrders.map(o => ({ 
    id: o.id, 
    order_id: o.order_id,
    status: o.status, 
    totalPrice: o.totalPrice,
    customer: o.customerName,
    itemCount: o.items.length
  })));
  
  const totalRevenue = completedOrders.reduce(
    (sum, order) => sum + (order.totalPrice || 0), 
    0
  );
  
  console.log('AdminDashboard - Order-based revenue calculation:', {
    completedOrdersCount: completedOrders.length,
    totalRevenue: totalRevenue,
    groupedOrdersCount: groupedBookings.length
  });

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
