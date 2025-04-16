
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BookingStatusBadge } from './BookingStatusBadge';
import { FileText, MoreVertical, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { BookingWithProduct } from './types';

interface BookingsTableProps {
  bookings: BookingWithProduct[];
  isLoading: boolean;
  isError: boolean;
  onViewDetails: (booking: BookingWithProduct) => void;
}

export const BookingsTable = ({ bookings, isLoading, isError, onViewDetails }: BookingsTableProps) => {
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
          <TableHead className="text-right">Действия</TableHead>
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
            <TableRow key={booking.id}>
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
                <BookingStatusBadge status={booking.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Открыть меню</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(booking)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Просмотр деталей
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
