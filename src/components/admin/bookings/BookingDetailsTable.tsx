import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Plus, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroupedBooking } from './types';
import { BookingStatusSelect } from './BookingStatusSelect';
import { AddProductDialog } from './AddProductDialog';
import { InlineQuantityEditor } from './InlineQuantityEditor';
import { updateBookingDates, deleteBooking } from '@/services/bookingService'; // Добавили deleteBooking
import { formatDateRange } from '@/utils/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface BookingDetailsTableProps {
  groupedBooking: GroupedBooking;
  onStatusUpdate?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
  onItemsChanged?: () => void;
}

const formatForDateTimeInput = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const BookingDetailsTable = ({ 
  groupedBooking, 
  onStatusUpdate,
  onDelete,
  isDeleting,
  onItemsChanged
}: BookingDetailsTableProps) => {
  const { toast } = useToast();
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState(formatForDateTimeInput(groupedBooking.startDate));
  const [newEndDate, setNewEndDate] = useState(formatForDateTimeInput(groupedBooking.endDate));
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);

  // Стейт для лоадера удаления отдельного товара
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const handleDeleteClick = async (e: React.MouseEvent, bookingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) await onDelete(bookingId);
  };

  const handleStatusSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSaveDates = async () => {
    try {
      setIsUpdatingDates(true);
      const startISO = new Date(newStartDate).toISOString();
      const endISO = new Date(newEndDate).toISOString();

      await updateBookingDates(groupedBooking.id, startISO, endISO, groupedBooking.order_id);
      
      setEditDatesOpen(false);
      toast({ title: 'Успешно', description: 'Даты бронирования обновлены' });
      
      if (onItemsChanged) onItemsChanged();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось обновить даты бронирования', variant: 'destructive' });
    } finally {
      setIsUpdatingDates(false);
    }
  };

  // ФУНКЦИЯ УДАЛЕНИЯ КОНКРЕТНОГО ТОВАРА
  const handleDeleteItem = async (e: React.MouseEvent, itemBookingId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!itemBookingId) {
      toast({ title: 'Ошибка', description: 'ID товара не найден', variant: 'destructive' });
      return;
    }

    const isLastItem = groupedBooking.items.length === 1;
    const confirmMessage = isLastItem
      ? 'Это единственный товар в заказе. Его удаление приведет к удалению всего бронирования. Продолжить?'
      : 'Вы уверены, что хотите удалить этот товар из бронирования?';

    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingItemId(itemBookingId);
      // Удаляем конкретную строку из таблицы БД
      await deleteBooking(itemBookingId);
      
      toast({
        title: 'Успешно',
        description: isLastItem ? 'Бронирование полностью удалено' : 'Товар успешно удален',
      });
      
      // Обновляем данные на фронтенде
      if (onItemsChanged) onItemsChanged();
    } catch (error: any) {
      console.error('Ошибка при удалении товара:', error);
      toast({ title: 'Ошибка', description: error.message || 'Не удалось удалить товар', variant: 'destructive' });
    } finally {
      setDeletingItemId(null);
    }
  };

  const firstItem = groupedBooking.items[0];
  const firstProduct = firstItem?.product;

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      
      <div className="flex items-center justify-between mb-4 p-3 bg-background rounded-md border">
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Период аренды:</span>
          <span className="text-sm font-medium">
            {formatDateRange(new Date(groupedBooking.startDate), new Date(groupedBooking.endDate), true)}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setNewStartDate(formatForDateTimeInput(groupedBooking.startDate));
            setNewEndDate(formatForDateTimeInput(groupedBooking.endDate));
            setEditDatesOpen(true);
          }}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Изменить даты
        </Button>
      </div>

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
                showAllOptions={true}
              />
            </div>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddProductDialogOpen(true)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить товар
          </Button>
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
            <TableHead className="w-[50px]"></TableHead> {/* Колонка для кнопки удаления */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedBooking.items.map((item, index) => (
            <TableRow key={`${groupedBooking.id}-detail-${index}`} className="group hover:bg-muted/50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.product?.title || 'Неизвестный продукт'}</span>
                </div>
              </TableCell>
              <TableCell>
                <InlineQuantityEditor
                  bookingId={groupedBooking.id}
                  productId={item.productId}
                  currentQuantity={item.quantity}
                  onSuccess={() => { if (onItemsChanged) onItemsChanged(); }}
                />
              </TableCell>
              <TableCell>
                {item.product?.price ? `${item.product.price.toLocaleString()} ₽` : '—'}
              </TableCell>
              <TableCell className="font-medium">
                {item.product?.price && item.quantity ? 
                  `${(item.product.price * item.quantity).toLocaleString()} ₽` : '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteItem(e, item.bookingId)}
                  disabled={deletingItemId === item.bookingId}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  title="Удалить товар"
                >
                  {deletingItemId === item.bookingId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* colSpan изменен с 3 на 4 из-за новой колонки */}
          <TableRow className="border-t-2 font-medium bg-muted/20">
            <TableCell colSpan={4} className="text-right">Итого:</TableCell>
            <TableCell className="font-bold">
              {groupedBooking.totalPrice?.toLocaleString() || '0'} ₽
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <AddProductDialog
        open={addProductDialogOpen}
        onOpenChange={setAddProductDialogOpen}
        groupedBooking={groupedBooking}
        onSuccess={() => { if (onItemsChanged) onItemsChanged(); }}
      />

      <Dialog open={editDatesOpen} onOpenChange={setEditDatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование дат аренды</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Дата и время заезда</Label>
              <Input 
                type="datetime-local" 
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата и время выезда</Label>
              <Input 
                type="datetime-local" 
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDatesOpen(false)} disabled={isUpdatingDates}>
              Отмена
            </Button>
            <Button onClick={handleSaveDates} disabled={isUpdatingDates}>
              {isUpdatingDates && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};