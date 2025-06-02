
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GroupedBooking } from './types';

interface BookingDetailsTableProps {
  groupedBooking: GroupedBooking;
}

export const BookingDetailsTable = ({ groupedBooking }: BookingDetailsTableProps) => {
  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      <h4 className="text-sm font-medium mb-3">Детали заказа</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Товар</TableHead>
            <TableHead>Количество</TableHead>
            <TableHead>Цена за единицу</TableHead>
            <TableHead>Сумма</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedBooking.items.map((item, index) => (
            <TableRow key={`${groupedBooking.id}-detail-${index}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.product?.title || 'Неизвестный продукт'}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {item.quantity} шт.
                </Badge>
              </TableCell>
              <TableCell>
                {item.product?.price ? `${item.product.price.toLocaleString()} ₽` : '—'}
              </TableCell>
              <TableCell className="font-medium">
                {item.product?.price && item.quantity ? 
                  `${(item.product.price * item.quantity).toLocaleString()} ₽` : '—'}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-medium">
            <TableCell colSpan={3} className="text-right">Итого:</TableCell>
            <TableCell className="font-bold">
              {groupedBooking.totalPrice?.toLocaleString() || '0'} ₽
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
