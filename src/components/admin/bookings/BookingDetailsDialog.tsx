
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Phone, Mail, FileText } from 'lucide-react';
import { BookingWithProduct } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';
import { BookingPeriod } from '@/types/product';

interface BookingDetailsDialogProps {
  booking: BookingWithProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (id: string, status: BookingPeriod['status']) => void;
  onItemsChanged?: () => void; // New prop (though not used directly in this dialog)
}

export const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({
  booking,
  open,
  onOpenChange,
  onStatusUpdate,
  onItemsChanged // Added but not used in this component
}) => {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Детали бронирования</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{booking.customerName}</div>
              <div className="text-sm text-muted-foreground">Клиент</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{booking.customerEmail}</div>
              <div className="text-sm text-muted-foreground">Email</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{booking.customerPhone}</div>
              <div className="text-sm text-muted-foreground">Телефон</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Период аренды</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Продукт:</div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div>
                <div className="font-medium">{booking.product?.title || 'Неизвестный продукт'}</div>
                <div className="text-sm text-muted-foreground">
                  Количество: {booking.quantity} шт.
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{booking.totalPrice?.toLocaleString()} ₽</div>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <div className="font-medium">Примечания:</div>
                <div className="text-sm text-muted-foreground">{booking.notes}</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm font-medium">Статус:</span>
            <BookingStatusSelect
              booking={booking}
              onStatusUpdate={onStatusUpdate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
