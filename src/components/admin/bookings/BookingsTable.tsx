
import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { BookingWithProduct, GroupedBooking } from './types';
import { GroupedBookingRow } from './GroupedBookingRow';
import { BookingPeriod } from '@/types/product';

interface BookingsTableProps {
  bookings: BookingWithProduct[];
  isLoading: boolean;
  isError: boolean;
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate: (id: string, status: BookingPeriod['status']) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  groupedBookings: GroupedBooking[];
  onItemsChanged?: () => void; // New prop
}

export const BookingsTable: React.FC<BookingsTableProps> = ({
  bookings,
  isLoading,
  isError,
  onViewDetails,
  onStatusUpdate,
  onDelete,
  isDeleting,
  groupedBookings,
  onItemsChanged
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка бронирований...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Ошибка при загрузке бронирований. Пожалуйста, попробуйте еще раз.
        </AlertDescription>
      </Alert>
    );
  }

  if (groupedBookings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Бронирования не найдены
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Клиент</TableHead>
            <TableHead>Товары</TableHead>
            <TableHead>Даты</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedBookings.map((groupedBooking) => (
            <GroupedBookingRow
              key={groupedBooking.id}
              groupedBooking={groupedBooking}
              allBookings={bookings}
              onViewDetails={onViewDetails}
              onStatusUpdate={onStatusUpdate}
              onDelete={onDelete}
              isDeleting={isDeleting}
              onItemsChanged={onItemsChanged}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
