
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { BookingWithProduct } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';

interface BookingsTableProps {
  bookings: BookingWithProduct[];
  isLoading: boolean;
  isError: boolean;
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate?: (id: string, status: string) => void;
}

export const BookingsTable = ({ bookings, isLoading, isError, onViewDetails, onStatusUpdate }: BookingsTableProps) => {
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
        ) : bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-4">
              Бронирования не найдены.
            </TableCell>
          </TableRow>
        ) : (
          bookings.map(booking => (
            <TableRow key={booking.id} className="cursor-pointer" onClick={() => onViewDetails(booking)}>
              <TableCell>{booking.customerName}</TableCell>
              <TableCell>{booking.product?.title || 'Неизвестный продукт'}</TableCell>
              <TableCell>{booking.customerEmail}</TableCell>
              <TableCell>{booking.customerPhone}</TableCell>
              <TableCell>
                {format(new Date(booking.startDate), 'PPP')} {format(new Date(booking.startDate), 'HH:00')}
              </TableCell>
              <TableCell>
                {format(new Date(booking.endDate), 'PPP')} {format(new Date(booking.endDate), 'HH:00')}
              </TableCell>
              <TableCell>
                <BookingStatusSelect
                  booking={booking}
                  onStatusUpdate={onStatusUpdate}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
