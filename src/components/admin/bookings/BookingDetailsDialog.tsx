
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { BookingWithProduct } from './types';
import { BookingPeriod } from '@/types/product';

interface BookingDetailsDialogProps {
  booking: BookingWithProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (id: string, status: BookingPeriod['status']) => void;
}

export const BookingDetailsDialog = ({
  booking,
  open,
  onOpenChange,
  onStatusUpdate,
}: BookingDetailsDialogProps) => {
  if (!booking) return null;

  const handleStatusUpdate = (status: BookingPeriod['status']) => {
    onStatusUpdate(booking.id, status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Детали бронирования</DialogTitle>
          <DialogDescription>Информация о бронировании и возможность изменить статус</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Информация о продукте</h3>
            <p>
              <strong>Продукт:</strong> {booking.product?.title || 'Неизвестный продукт'}
            </p>
            <p>
              <strong>Цена:</strong> {booking.product?.price || 0} ₽ / день
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Информация о клиенте</h3>
            <p>
              <strong>Имя:</strong> {booking.customerName}
            </p>
            <p>
              <strong>Email:</strong> {booking.customerEmail}
            </p>
            <p>
              <strong>Телефон:</strong> {booking.customerPhone}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Информация о бронировании</h3>
            <p>
              <strong>Дата начала:</strong>{' '}
              {format(new Date(booking.startDate), 'PPP')} в {format(new Date(booking.startDate), 'HH:00')}
            </p>
            <p>
              <strong>Дата окончания:</strong>{' '}
              {format(new Date(booking.endDate), 'PPP')} в {format(new Date(booking.endDate), 'HH:00')}
            </p>
            <p>
              <strong>Общая стоимость:</strong> {booking.totalPrice.toFixed(2)} ₽
            </p>
            {booking.notes && (
              <p>
                <strong>Примечания:</strong> {booking.notes}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Обновить статус</h3>
            <div className="flex flex-wrap gap-2">
              {booking.status !== 'confirmed' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusUpdate('confirmed')}
                  type="button"
                >
                  Подтвердить
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
              {booking.status !== 'cancelled' && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusUpdate('cancelled')}
                  type="button"
                >
                  Отменить
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
              {booking.status !== 'completed' && (
                <Button 
                  variant="secondary" 
                  onClick={() => handleStatusUpdate('completed')}
                  type="button"
                >
                  Завершить
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
