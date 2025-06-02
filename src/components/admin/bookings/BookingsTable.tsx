
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { BookingWithProduct, GroupedBooking } from './types';
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
            <TableHead className="w-[200px]">Клиент</TableHead>
            <TableHead className="w-[250px]">Товары</TableHead>
            <TableHead className="w-[200px]">Email</TableHead>
            <TableHead className="w-[150px]">Телефон</TableHead>
            <TableHead className="w-[180px]">Дата начала</TableHead>
            <TableHead className="w-[180px]">Дата окончания</TableHead>
            <TableHead className="w-[120px]">Общая сумма</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  <span>Загрузка бронирований...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-red-500">
                Ошибка загрузки бронирований. Пожалуйста, попробуйте снова.
              </TableCell>
            </TableRow>
          ) : displayData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                Бронирования не найдены.
              </TableCell>
            </TableRow>
          ) : showGrouped ? (
            // Render grouped bookings with inline details
            (displayData as GroupedBooking[]).map(groupedBooking => {
              const totalQuantity = groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0);
              const isSelected = selectedBookingId === groupedBooking.id;
              
              return (
                <>
                  <TableRow 
                    key={groupedBooking.id} 
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`} 
                    onClick={() => handleGroupedBookingClick(groupedBooking)}
                  >
                    <TableCell className="font-medium">{groupedBooking.customerName}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {groupedBooking.items.length} товар{groupedBooking.items.length === 1 ? '' : groupedBooking.items.length < 5 ? 'а' : 'ов'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {totalQuantity} шт.
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Нажмите для просмотра деталей
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{groupedBooking.customerEmail}</TableCell>
                    <TableCell className="text-sm">{groupedBooking.customerPhone}</TableCell>
                    <TableCell className="text-sm">
                      {groupedBooking.startDate && isValid(new Date(groupedBooking.startDate)) ? (
                        <div className="space-y-1">
                          <div>{formatSafeDate(groupedBooking.startDate, 'dd.MM.yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{formatSafeDate(groupedBooking.startDate, 'HH:00')}</div>
                        </div>
                      ) : (
                        'Недействительная дата'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {groupedBooking.endDate && isValid(new Date(groupedBooking.endDate)) ? (
                        <div className="space-y-1">
                          <div>{formatSafeDate(groupedBooking.endDate, 'dd.MM.yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{formatSafeDate(groupedBooking.endDate, 'HH:00')}</div>
                        </div>
                      ) : (
                        'Недействительная дата'
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {groupedBooking.totalPrice?.toLocaleString() || '0'} ₽
                    </TableCell>
                  </TableRow>
                  {/* Render details row directly below if selected */}
                  {isSelected && (
                    <TableRow key={`${groupedBooking.id}-details`}>
                      <TableCell colSpan={7} className="p-0">
                        <BookingDetailsTable 
                          groupedBooking={groupedBooking}
                          onStatusUpdate={onStatusUpdate}
                          onDelete={onDelete}
                          isDeleting={isDeleting}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
