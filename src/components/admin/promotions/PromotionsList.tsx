
import React, { useState } from 'react';
import { Promotion } from '@/types/promotion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

type PromotionsListProps = {
  promotions: Promotion[];
  onEdit: (promotion: Promotion) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
};

const PromotionsList = ({ promotions, onEdit, onDelete, onReorder }: PromotionsListProps) => {
  const [deletePromotionId, setDeletePromotionId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeletePromotionId(id);
  };

  const handleConfirmDelete = () => {
    if (deletePromotionId) {
      onDelete(deletePromotionId);
      setDeletePromotionId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex === targetIndex) return;
    
    const reorderedPromotions = [...promotions];
    const [movedItem] = reorderedPromotions.splice(sourceIndex, 1);
    reorderedPromotions.splice(targetIndex, 0, movedItem);
    
    setDraggedItemIndex(null);
    onReorder(reorderedPromotions.map(p => p.id));
  };

  return (
    <div className="space-y-4">
      {promotions.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">Нет акций. Добавьте первую акцию.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion, index) => (
            <Card 
              key={promotion.id}
              className={`relative ${draggedItemIndex === index ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="absolute left-0 top-0 bottom-0 px-2 cursor-grab flex items-center">
                <GripVertical className="text-muted-foreground" />
              </div>
              <CardContent className="flex flex-row items-center p-4 pl-10">
                <div className="w-20 flex-shrink-0">
                  <AspectRatio ratio={9/16} className="bg-muted rounded overflow-hidden">
                    <img
                      src={promotion.imageUrl.startsWith('http') ? promotion.imageUrl : `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${promotion.imageUrl}`}
                      alt={promotion.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </AspectRatio>
                </div>
                <div className="ml-4 flex-grow">
                  <div className="flex items-center">
                    <h3 className="font-medium">{promotion.title}</h3>
                    {promotion.active ? 
                      <Eye className="h-4 w-4 text-green-500 ml-2" /> : 
                      <EyeOff className="h-4 w-4 text-muted-foreground ml-2" />
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">{promotion.linkUrl}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(promotion)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Редактировать</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(promotion.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Удалить</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletePromotionId} onOpenChange={(open) => !open && setDeletePromotionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Акция будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromotionsList;
