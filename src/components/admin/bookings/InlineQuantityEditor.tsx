
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateBookingItemQuantity } from '@/services/bookingItemService';

interface InlineQuantityEditorProps {
  bookingId: string;
  productId: string;
  currentQuantity: number;
  onSuccess: () => void;
}

export const InlineQuantityEditor: React.FC<InlineQuantityEditorProps> = ({
  bookingId,
  productId,
  currentQuantity,
  onSuccess
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(currentQuantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (newQuantity === currentQuantity) {
      setIsEditing(false);
      return;
    }

    if (newQuantity < 0) {
      toast({
        title: 'Ошибка',
        description: 'Количество не может быть отрицательным',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateBookingItemQuantity({
        bookingId,
        productId,
        newQuantity
      });

      toast({
        title: 'Успех',
        description: newQuantity === 0 
          ? 'Товар удален из заказа' 
          : 'Количество обновлено'
      });

      onSuccess();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить количество',
        variant: 'destructive'
      });
      setNewQuantity(currentQuantity); // Reset to original value
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNewQuantity(currentQuantity);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={newQuantity}
          onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
          className="w-20 h-8"
          min="0"
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isUpdating}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isUpdating}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{currentQuantity} шт.</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
