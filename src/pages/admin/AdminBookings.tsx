
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/services/supabaseService';
import { BookingWithProduct } from '@/components/admin/bookings/types';
import { BookingFilters } from '@/components/admin/bookings/BookingFilters';
import { BookingsTable } from '@/components/admin/bookings/BookingsTable';
import { BookingDetailsDialog } from '@/components/admin/bookings/BookingDetailsDialog';
import { BookingPeriod } from '@/types/product';

const AdminBookings = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingPeriod['status'] | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: supabaseService.getProducts
  });

  const {
    data: bookings,
    refetch,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: supabaseService.getBookings
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

  const handleStatusUpdate = async (id: string, status: BookingPeriod['status']) => {
    try {
      await supabaseService.updateBookingStatus(id, status);
      toast({
        title: 'Успех',
        description: 'Статус бронирования успешно обновлен.'
      });
      refetch();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить статус бронирования.',
        variant: 'destructive'
      });
    }
  };

  const handleOpenDetails = (booking: BookingWithProduct) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Управление бронированиями</CardTitle>
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
          />
        </CardContent>
      </Card>

      <BookingDetailsDialog
        booking={selectedBooking}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
};

export default AdminBookings;
