
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { GroupedBooking, BookingWithProduct } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';

interface GroupedBookingRowProps {
  groupedBooking: GroupedBooking;
  onViewDetails: (booking: BookingWithProduct) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
}

export const GroupedBookingRow = ({
  groupedBooking,
  onViewDetails,
  onStatusUpdate,
  onDelete,
  isDeleting
}: GroupedBookingRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleViewDetails = () => {
    console.log('Opening details for grouped booking:', {
      id: groupedBooking.id,
      itemsCount: groupedBooking.items.length,
      totalQuantity: groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0)
    });
    
    // Convert grouped booking to BookingWithProduct format for details view
    const bookingForDetails: BookingWithProduct = {
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
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const totalQuantity = groupedBooking.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Main grouped booking row */}
      <TableRow 
        className="cursor-pointer hover:bg-muted/50" 
        onClick={handleViewDetails}
      >
        <TableCell>{groupedBooking.customerName}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
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
                Нажмите для просмотра
              </span>
            </div>
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

      {/* Expanded product rows */}
      {isExpanded && groupedBooking.items.map((item, index) => (
        <TableRow key={`${groupedBooking.id}-item-${index}`} className="bg-muted/20">
          <TableCell className="pl-12 text-muted-foreground">
            ↳ Товар {index + 1}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.product?.title || 'Неизвестный продукт'}</span>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {item.quantity} шт.
              </Badge>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell className="text-muted-foreground">
            {item.product?.price && item.quantity ? 
              (item.product.price * item.quantity).toLocaleString() : '—'} ₽
          </TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
        </TableRow>
      ))}
    </>
  );
};
