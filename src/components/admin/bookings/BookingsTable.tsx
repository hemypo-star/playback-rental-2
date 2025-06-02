
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { BookingWithProduct, GroupedBooking } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  const handleViewDetails = (groupedBooking: GroupedBooking) => {
    // Преобразуем обратно в формат BookingWithProduct для детального просмотра
    const firstItem = groupedBookings?.find(gb => gb.id === groupedBooking.id);
    if (firstItem) {
      const bookingForDetails: BookingWithProduct = {
        id: firstItem.id,
        productId: firstItem.items[0]?.productId || '',
        customerName: firstItem.customerName,
        customerEmail: firstItem.customerEmail,
        customerPhone: firstItem.customerPhone,
        startDate: firstItem.startDate,
        endDate: firstItem.endDate,
        status: firstItem.status,
        totalPrice: firstItem.totalPrice,
        quantity: firstItem.items.reduce((sum, item) => sum + item.quantity, 0),
        notes: firstItem.notes || '',
        createdAt: firstItem.createdAt,
        product: firstItem.items[0]?.product
      };
      onViewDetails(bookingForDetails);
    }
  };

  const displayBookings = groupedBookings || [];

  return (
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
        ) : displayBookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-4">
              Бронирования не найдены.
            </TableCell>
          </TableRow>
        ) : (
          displayBookings.map(groupedBooking => (
            <TableRow key={groupedBooking.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(groupedBooking)}>
              <TableCell>{groupedBooking.customerName}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {groupedBooking.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm">{item.product?.title || 'Неизвестный продукт'}</span>
                      {item.quantity > 1 && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {item.quantity} шт.
                        </Badge>
                      )}
                    </div>
                  ))}
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
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
