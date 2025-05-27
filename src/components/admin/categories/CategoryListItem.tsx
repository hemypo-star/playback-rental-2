
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { Category } from '@/types/product';

type CategoryListItemProps = {
  category: Category;
  index: number;
  isDragging: boolean;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
};

export default function CategoryListItem({
  category,
  index,
  isDragging,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEdit,
  onDelete,
}: CategoryListItemProps) {
  return (
    <div 
      key={category.id}
      draggable={true}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`border rounded-md overflow-hidden ${isDragging && draggedIndex === index ? 'opacity-50' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="flex items-center p-4">
        <div className="mr-4 text-muted-foreground cursor-grab">
          <GripVertical className="h-6 w-6" />
        </div>
        <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                target.src = 'https://via.placeholder.com/48?text=No+Image';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-primary/10">
              <span className="text-xs text-primary">Нет фото</span>
            </div>
          )}
        </div>
        <div className="ml-4 flex-1">
          <h3 className="font-medium">{category.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {category.description || 'Нет описания'}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
