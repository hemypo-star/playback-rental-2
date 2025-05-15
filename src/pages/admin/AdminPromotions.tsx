import React, { useState } from 'react';
import { usePromotionManagement } from '@/hooks/usePromotionManagement';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PromotionForm from '@/components/admin/promotions/PromotionForm';
import PromotionsList from '@/components/admin/promotions/PromotionsList';
import { Promotion, PromotionFormValues } from '@/types/promotion';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminPromotions() {
  const {
    promotions,
    isLoading,
    addPromotion,
    updatePromotion,
    deletePromotion,
    reorderPromotions
  } = usePromotionManagement();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>(undefined);
  
  const handleAddClick = () => {
    setEditingPromotion(undefined);
    setDialogOpen(true);
  };
  const handleEditClick = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setDialogOpen(true);
  };
  const handleFormSubmit = (data: PromotionFormValues) => {
    if (editingPromotion) {
      updatePromotion({
        id: editingPromotion.id,
        data
      });
    } else {
      addPromotion(data);
    }
    setDialogOpen(false);
  };
  const handleFormCancel = () => {
    setDialogOpen(false);
  };
  const handleDeletePromotion = (id: string) => {
    deletePromotion(id);
  };
  const handleReorderPromotions = (ids: string[]) => {
    reorderPromotions(ids);
  };

  return <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление акциями</h1>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить акцию
        </Button>
      </div>

      <div className="my-4 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">Инструкция</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Создайте акцию с названием, изображением и ссылкой</li>
          <li>Изображение будет отображаться с соотношением сторон 3:4</li>
          <li>Перетаскивайте карточки, чтобы изменить порядок акций в слайдере</li>
          <li>Используйте переключатель «Активна», чтобы временно скрыть акцию</li>
        </ul>
      </div>

      {isLoading ? <p className="text-center py-4">Загрузка...</p> : <PromotionsList promotions={promotions} onEdit={handleEditClick} onDelete={handleDeletePromotion} onReorder={handleReorderPromotions} />}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Редактировать акцию' : 'Добавить акцию'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-4">
              <PromotionForm 
                promotion={editingPromotion} 
                onSubmit={handleFormSubmit} 
                onCancel={handleFormCancel} 
                isSubmitting={isLoading} 
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>;
}
