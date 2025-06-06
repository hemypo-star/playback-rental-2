
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { BookingWithProduct, GroupedBooking } from './types';
import { BookingDetailsTable } from './BookingDetailsTable';
import { BookingPeriod } from '@/types/product';

interface GroupedBookingRowProps {
  groupedBooking: GroupedBooking;
  allBookings: BookingWithProduct[];
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate: (id: string, status: BookingPeriod['status']) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  onItemsChanged?: () => void;
}

export const GroupedBookingRow: React.FC<GroupedBookingRowProps> = ({
  groupedBooking,
  allBookings,
  onViewDetails,
  onStatusUpdate,
  onDelete,
  isDeleting,
  onItemsChanged
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasMultipleItems = groupedBooking.items.length > 1;
    const confirmMessage = hasMultipleItems 
      ? `Вы уверены, что хотите удалить весь заказ? Это удалит ${groupedBooking.items.length} товаров.`
      : 'Вы уверены, что хотите удалить это бронирование?';
    
    if (confirm(confirmMessage)) {
      await onDelete(groupedBooking.id);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Get first item for display
  const firstItem = groupedBooking.items[0];
  const hasMultipleItems = groupedBooking.items.length > 1;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={toggleExpanded}
      >
        <TableCell>
          <div className="space-y-1">
            <div className="font-medium">{groupedBooking.customerName}</div>
            <div className="text-sm text-muted-foreground">{groupedBooking.customerEmail}</div>
            <div className="text-sm text-muted-foreground">{groupedBooking.customerPhone}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div>
              <div className="font-medium">
                {firstItem?.product?.title || 'Неизвестный продукт'}
                {hasMultipleItems && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    +{groupedBooking.items.length - 1} товар(ов)
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Общее кол-во: {groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0)} шт.
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="w-1/4">
          <div className="text-sm">
            <div>{new Date(groupedBooking.startDate).toLocaleDateString()}</div>
            <div className="text-muted-foreground">
              до {new Date(groupedBooking.endDate).toLocaleDateString()}
            </div>
          </div>
        </TableCell>
        <TableCell className="w-1/6">
          <div className="font-medium">
            {groupedBooking.totalPrice?.toLocaleString() || '0'} ₽
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting === groupedBooking.id}
              className="text-red-600 hover:text-red-700"
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
      
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <BookingDetailsTable
              groupedBooking={groupedBooking}
              onStatusUpdate={onStatusUpdate}
              onDelete={onDelete}
              isDeleting={isDeleting}
              onItemsChanged={onItemsChanged}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
