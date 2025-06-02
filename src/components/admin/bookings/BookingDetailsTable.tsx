
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2 } from 'lucide-react';
import { GroupedBooking } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';

interface BookingDetailsTableProps {
  groupedBooking: GroupedBooking;
  onStatusUpdate?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
}

export const BookingDetailsTable = ({ 
  groupedBooking, 
  onStatusUpdate,
  onDelete,
  isDeleting 
}: BookingDetailsTableProps) => {
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

  // Safely get the first product or create a fallback
  const firstItem = groupedBooking.items[0];
  const firstProduct = firstItem?.product;

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Детали заказа</h4>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Статус:</span>
            <div onClick={handleStatusSelectClick}>
              <BookingStatusSelect
                booking={{
                  id: groupedBooking.id,
                  productId: firstItem?.productId || '',
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
                  product: firstProduct || undefined
                }}
                onStatusUpdate={onStatusUpdate}
              />
            </div>
          </div>
          <div className="h-4 w-px bg-border"></div>
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
      </div>
      
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
          <TableRow className="border-t-2 font-medium bg-muted/20">
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
