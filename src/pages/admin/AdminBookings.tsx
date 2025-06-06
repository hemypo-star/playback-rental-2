import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getProducts } from '@/services/productService';
import { getBookings, updateBookingStatus, deleteBooking } from '@/services/bookingService';
import { analyzeAndFixOrderStatuses, updateOrderStatus } from '@/services/orderStatusService';
import { BookingWithProduct } from '@/components/admin/bookings/types';
import { BookingFilters } from '@/components/admin/bookings/BookingFilters';
import { BookingsTable } from '@/components/admin/bookings/BookingsTable';
import { BookingDetailsDialog } from '@/components/admin/bookings/BookingDetailsDialog';
import { BookingPeriod } from '@/types/product';
import { groupBookingsByOrder } from '@/utils/bookingGroupingUtils';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const AdminBookings = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingPeriod['status'] | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UNIFIED: Use same cache keys as AdminDashboard
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: getProducts
  });

  const {
    data: bookings,
    refetch,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['bookings'], // UNIFIED: Now matches AdminDashboard cache key
    queryFn: getBookings
  });

  const bookingsWithProducts: BookingWithProduct[] = React.useMemo(() => {
    if (!bookings || !products) return [];
    return bookings.map(booking => {
      const product = products.find(p => p.id === booking.productId);
      return { ...booking, product };
    });
  }, [bookings, products]);

  const filteredBookings = React.useMemo(() => {
    if (!bookingsWithProducts) return [];
    let filtered = [...bookingsWithProducts];
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.customerName.toLowerCase().includes(lowerSearch) || 
        booking.customerEmail.toLowerCase().includes(lowerSearch) || 
        booking.customerPhone.toLowerCase().includes(lowerSearch) || 
        booking.product?.title.toLowerCase().includes(lowerSearch) || 
        false
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }
    
    return filtered;
  }, [bookingsWithProducts, search, statusFilter]);

  // Group filtered bookings with enhanced debugging
  const groupedBookings = React.useMemo(() => {
    console.log('AdminBookings - Grouping filtered bookings:', filteredBookings.length);
    const grouped = groupBookingsByOrder(filteredBookings);
    console.log('AdminBookings - Grouped result:', grouped.length);
    return grouped;
  }, [filteredBookings]);

  // НОВАЯ ФУНКЦИЯ: Анализ и исправление статусов
  const handleAnalyzeAndFixStatuses = async () => {
    setIsAnalyzing(true);
    try {
      console.log('Starting status analysis and cleanup...');
      const result = await analyzeAndFixOrderStatuses();
      
      toast({
        title: 'Анализ завершен',
        description: `Проанализировано заказов: ${result.analyzed}, исправлено: ${result.fixed}`,
      });
      
      if (result.issues.length > 0) {
        console.log('Issues found and fixed:', result.issues);
        toast({
          title: 'Найдены и исправлены проблемы',
          description: `Исправлено ${result.issues.length} заказов с несогласованными статусами`,
        });
      }
      
      // Обновляем данные
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error: any) {
      console.error('Error during status analysis:', error);
      toast({
        title: 'Ошибка анализа',
        description: error.message || 'Не удалось выполнить анализ статусов',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: BookingPeriod['status']) => {
    try {
      console.log('Updating booking status:', id, status);
      
      // Находим бронирование для получения order_id
      const booking = bookingsWithProducts.find(b => b.id === id);
      if (!booking) {
        throw new Error('Бронирование не найдено');
      }
      
      // УЛУЧШЕНИЕ: Если есть order_id, обновляем весь заказ
      if (booking.order_id) {
        console.log('Updating entire order status:', booking.order_id, status);
        await updateOrderStatus(booking.order_id, status);
        toast({
          title: 'Успех',
          description: 'Статус заказа обновлен для всех связанных бронирований.'
        });
      } else {
        // Иначе обновляем только одно бронирование
        await updateBookingStatus(id, status);
        toast({
          title: 'Успех',
          description: 'Статус бронирования успешно обновлен.'
        });
      }
      
      // Invalidate unified cache keys for both Dashboard and Bookings
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить статус бронирования.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBooking = async (id: string) => {
    console.log('handleDeleteBooking called with id:', id);
    
    // Prevent multiple deletion attempts
    if (isDeleting === id) {
      console.log('Already deleting this booking, ignoring request');
      return;
    }

    const confirmed = confirm('Вы уверены, что хотите удалить это бронирование? Это действие нельзя отменить.');
    console.log('User confirmed deletion:', confirmed);
    
    if (!confirmed) {
      return;
    }

    setIsDeleting(id);

    try {
      console.log('Calling deleteBooking service for ID:', id);
      const result = await deleteBooking(id);
      console.log('Booking deletion result:', result);
      
      toast({
        title: 'Успех',
        description: 'Бронирование успешно удалено.'
      });
      
      console.log('Invalidating queries to refresh data');
      // Invalidate unified cache keys for both Dashboard and Bookings
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // If the deleted booking was open in dialog, close it
      if (selectedBooking?.id === id) {
        console.log('Closing dialog for deleted booking');
        setDialogOpen(false);
        setSelectedBooking(null);
      }
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить бронирование.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // NEW: Handle booking items changes
  const handleBookingItemsChanged = async () => {
    console.log('Booking items changed, refreshing data');
    await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const handleOpenDetails = (booking: BookingWithProduct) => {
    console.log('Opening details for booking:', booking.id);
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Управление бронированиями</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleAnalyzeAndFixStatuses}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Анализируем...' : 'Исправить статусы'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BookingFilters
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          
          <BookingsTable
            bookings={filteredBookings}
            isLoading={isLoading}
            isError={isError}
            onViewDetails={handleOpenDetails}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDeleteBooking}
            isDeleting={isDeleting}
            groupedBookings={groupedBookings}
            onItemsChanged={handleBookingItemsChanged}
          />
        </CardContent>
      </Card>

      <BookingDetailsDialog
        booking={selectedBooking}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStatusUpdate={handleStatusUpdate}
        onItemsChanged={handleBookingItemsChanged}
      />
    </div>
  );
};

export default AdminBookings;
