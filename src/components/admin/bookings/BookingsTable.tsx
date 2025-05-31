
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Trash2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { BookingWithProduct } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';
import { Button } from '@/components/ui/button';

interface BookingsTableProps {
  bookings: BookingWithProduct[];
  isLoading: boolean;
  isError: boolean;
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export const BookingsTable = ({ 
  bookings, 
  isLoading, 
  isError, 
  onViewDetails, 
  onStatusUpdate,
  onDelete 
}: BookingsTableProps) => {
  
  // Helper function to safely format dates
  const formatSafeDate = (dateValue: string | Date | undefined | null, formatStr: string): string => {
    if (!dateValue) return 'Недействительная дата';
    
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    
    return isValid(date) ? format(date, formatStr) : 'Недействительная дата';
  };

  const handleDeleteClick = (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(bookingId);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Клиент</TableHead>
          <TableHead>Оборудование</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Телефон</TableHead>
          <TableHead>Дата начала</TableHead>
          <TableHead>Дата окончания</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-4">
              <div className="flex items-center justify-center">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                <span>Загрузка бронирований...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : isError ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-4 text-red-500">
              Ошибка загрузки бронирований. Пожалуйста, попробуйте снова.
            </TableCell>
          </TableRow>
        ) : bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-4">
              Бронирования не найдены.
            </TableCell>
          </TableRow>
        ) : (
          bookings.map(booking => (
            <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(booking)}>
              <TableCell>{booking.customerName}</TableCell>
              <TableCell>{booking.product?.title || 'Неизвестный продукт'}</TableCell>
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
              <TableCell>
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
