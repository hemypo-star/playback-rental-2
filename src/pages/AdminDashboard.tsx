
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { getProducts } from '@/services/product/productBasicService';
import { getCategories } from '@/services/categoryService';
import BookingStatistics from '@/components/admin/dashboard/BookingStatistics';
import RecentBookings from '@/components/admin/dashboard/RecentBookings';
import StatisticsCard from '@/components/admin/dashboard/StatisticsCard';

const AdminDashboard = () => {
  // Fetch products
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Fetch bookings
  const { data: bookingsResponse, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
  });

  // Extract the actual data arrays from API responses
  const products = productsResponse?.data || [];
  const categories = categoriesResponse?.data || [];
  const bookings = bookingsResponse?.data || [];

  // Calculate statistics
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalBookings = bookings.length;
  
  // Calculate revenue (assuming bookings have a total_amount field)
  const totalRevenue = bookings.reduce((sum: number, booking: any) => {
    return sum + (booking.total_amount || 0);
  }, 0);

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingBookings;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          title="Всего товаров"
          value={totalProducts.toString()}
          icon={Package}
          description="Активные товары в каталоге"
        />
        <StatisticsCard
          title="Категории"
          value={totalCategories.toString()}
          icon={TrendingUp}
          description="Доступные категории"
        />
        <StatisticsCard
          title="Бронирования"
          value={totalBookings.toString()}
          icon={Calendar}
          description="Всего бронирований"
        />
        <StatisticsCard
          title="Выручка"
          value={`₽${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          description="Общая сумма бронирований"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BookingStatistics bookings={bookings} />
        <RecentBookings bookings={bookings} />
      </div>
    </div>
  );
};

export default AdminDashboard;
