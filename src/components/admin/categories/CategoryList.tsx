
import { Category } from '@/types/product';
import CategoryListItem from './CategoryListItem';

type CategoryListProps = {
  categories: Category[];
  isDragging: boolean;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export default function CategoryList({
  categories,
  isDragging,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEdit,
  onDelete,
  isDeleting = false,
}: CategoryListProps) {
  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <CategoryListItem
          key={category.id}
          category={category}
          index={index}
          isDragging={isDragging}
          draggedIndex={draggedIndex}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}
