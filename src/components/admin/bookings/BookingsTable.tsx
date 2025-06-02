
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { BookingWithProduct, GroupedBooking } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingDetailsTable } from './BookingDetailsTable';
import { useState } from 'react';

interface BookingsTableProps {
  bookings: BookingWithProduct[];
  isLoading: boolean;
  isError: boolean;
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
  groupedBookings?: GroupedBooking[];
}

export const BookingsTable = ({ 
  bookings, 
  isLoading, 
  isError, 
  onViewDetails, 
  onStatusUpdate,
  onDelete,
  isDeleting,
  groupedBookings 
}: BookingsTableProps) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  console.log('BookingsTable render:', {
    bookingsCount: bookings.length,
    groupedBookingsCount: groupedBookings?.length || 0,
    hasGroupedBookings: !!groupedBookings,
    showingGrouped: groupedBookings && groupedBookings.length > 0
  });
  
  // Helper function to safely format dates
  const formatSafeDate = (dateValue: string | Date | undefined | null, formatStr: string): string => {
    if (!dateValue) return 'Недействительная дата';
    
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    
    return isValid(date) ? format(date, formatStr) : 'Недействительная дата';
  };

  const handleDeleteClick = async (e: React.MouseEvent, bookingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked for booking:', bookingId);
    
    if (onDelete) {
      console.log('Calling onDelete function');
      await onDelete(bookingId);
    } else {
      console.log('onDelete function not provided');
    }
  };

  const handleStatusSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleViewOriginalDetails = (booking: BookingWithProduct) => {
    console.log('Opening details for original booking:', booking.id);
    onViewDetails(booking);
  };

  const handleGroupedBookingClick = (groupedBooking: GroupedBooking) => {
    console.log('Grouped booking clicked:', groupedBooking.id);
    
    // Toggle selection
    if (selectedBookingId === groupedBooking.id) {
      setSelectedBookingId(null);
    } else {
      setSelectedBookingId(groupedBooking.id);
    }
  };

  // Determine what to display
  const showGrouped = groupedBookings && groupedBookings.length > 0;
  const displayData = showGrouped ? groupedBookings : bookings;
  
  console.log('Display decision:', {
    showGrouped,
    displayDataCount: displayData.length,
    usingGroupedData: showGrouped
  });

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Клиент</TableHead>
            <TableHead>Товары</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Дата начала</TableHead>
            <TableHead>Дата окончания</TableHead>
            <TableHead>Общая сумма</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  <span>Загрузка бронирований...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4 text-red-500">
                Ошибка загрузки бронирований. Пожалуйста, попробуйте снова.
              </TableCell>
            </TableRow>
          ) : displayData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4">
                Бронирования не найдены.
              </TableCell>
            </TableRow>
          ) : showGrouped ? (
            // Render grouped bookings
            (displayData as GroupedBooking[]).map(groupedBooking => {
              const totalQuantity = groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0);
              const isSelected = selectedBookingId === groupedBooking.id;
              
              return (
                <TableRow 
                  key={groupedBooking.id} 
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`} 
                  onClick={() => handleGroupedBookingClick(groupedBooking)}
                >
                  <TableCell>{groupedBooking.customerName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {groupedBooking.items.length} товар{groupedBooking.items.length === 1 ? '' : groupedBooking.items.length < 5 ? 'а' : 'ов'}
                        </span>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {totalQuantity} шт.
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Нажмите для деталей
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{groupedBooking.customerEmail}</TableCell>
                  <TableCell>{groupedBooking.customerPhone}</TableCell>
                  <TableCell>
                    {groupedBooking.startDate && isValid(new Date(groupedBooking.startDate)) ? (
                      <>
                        {formatSafeDate(groupedBooking.startDate, 'PPP')} {formatSafeDate(groupedBooking.startDate, 'HH:00')}
                      </>
                    ) : (
                      'Недействительная дата'
                    )}
                  </TableCell>
                  <TableCell>
                    {groupedBooking.endDate && isValid(new Date(groupedBooking.endDate)) ? (
                      <>
                        {formatSafeDate(groupedBooking.endDate, 'PPP')} {formatSafeDate(groupedBooking.endDate, 'HH:00')}
                      </>
                    ) : (
                      'Недействительная дата'
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {groupedBooking.totalPrice?.toLocaleString() || '0'} ₽
                  </TableCell>
                  <TableCell onClick={handleStatusSelectClick}>
                    <BookingStatusSelect
                      booking={{
                        id: groupedBooking.id,
                        productId: groupedBooking.items[0]?.productId || '',
                        customerName: groupedBooking.customerName,
                        customerEmail: groupedBooking.customerEmail,
                        customerPhone: groupedBooking.customerPhone,
                        startDate: groupedBooking.startDate,
                        endDate: groupedBooking.endDate,
                        status: groupedBooking.status,
                        totalPrice: groupedBooking.totalPrice,
                        quantity: groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0),
                        notes: groupedBooking.notes || '',
                        createdAt: groupedBooking.createdAt,
                        product: groupedBooking.items[0]?.product
                      }}
                      onStatusUpdate={onStatusUpdate}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const bookingForDetails = {
                            id: groupedBooking.id,
                            productId: groupedBooking.items[0]?.productId || '',
                            customerName: groupedBooking.customerName,
                            customerEmail: groupedBooking.customerEmail,
                            customerPhone: groupedBooking.customerPhone,
                            startDate: groupedBooking.startDate,
                            endDate: groupedBooking.endDate,
                            status: groupedBooking.status,
                            totalPrice: groupedBooking.totalPrice,
                            quantity: groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0),
                            notes: groupedBooking.notes || '',
                            createdAt: groupedBooking.createdAt,
                            product: groupedBooking.items[0]?.product
                          };
                          onViewDetails(bookingForDetails);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Подробно
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteClick(e, groupedBooking.id)}
                        disabled={isDeleting === groupedBooking.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting === groupedBooking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            // Render original bookings
            (displayData as BookingWithProduct[]).map(booking => (
              <TableRow 
                key={booking.id} 
                className="cursor-pointer hover:bg-muted/50" 
                onClick={() => handleViewOriginalDetails(booking)}
              >
                <TableCell>{booking.customerName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{booking.product?.title || 'Неизвестный продукт'}</span>
                    {(booking.quantity || 1) > 1 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {booking.quantity || 1} шт.
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{booking.customerEmail}</TableCell>
                <TableCell>{booking.customerPhone}</TableCell>
                <TableCell>
                  {booking.startDate && isValid(new Date(booking.startDate)) ? (
                    <>
                      {formatSafeDate(booking.startDate, 'PPP')} {formatSafeDate(booking.startDate, 'HH:00')}
                    </>
                  ) : (
                    'Недействительная дата'
                  )}
                </TableCell>
                <TableCell>
                  {booking.endDate && isValid(new Date(booking.endDate)) ? (
                    <>
                      {formatSafeDate(booking.endDate, 'PPP')} {formatSafeDate(booking.endDate, 'HH:00')}
                    </>
                  ) : (
                    'Недействительная дата'
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {booking.totalPrice?.toLocaleString() || '0'} ₽
                </TableCell>
                <TableCell onClick={handleStatusSelectClick}>
                  <BookingStatusSelect
                    booking={booking}
                    onStatusUpdate={onStatusUpdate}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, booking.id)}
                    disabled={isDeleting === booking.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeleting === booking.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Detailed table for selected grouped booking */}
      {showGrouped && selectedBookingId && (
        <BookingDetailsTable 
          groupedBooking={groupedBookings!.find(g => g.id === selectedBookingId)!}
        />
      )}
    </div>
  );
};
