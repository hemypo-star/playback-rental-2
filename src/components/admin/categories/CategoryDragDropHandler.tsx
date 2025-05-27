
import { useState, useEffect } from 'react';
import { Category } from '@/types/product';

export const useCategoryDragDrop = (categories: Category[] | undefined) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [categoriesOrder, setCategoriesOrder] = useState<Category[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  // Update categoriesOrder when categories data changes, but only if order hasn't been modified
  useEffect(() => {
    if (categories && !hasOrderChanged) {
      setCategoriesOrder(categories);
    }
  }, [categories, hasOrderChanged]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...categoriesOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Remove the item from its original position
    newOrder.splice(draggedIndex, 1);
    // Insert it at the new position
    newOrder.splice(index, 0, draggedItem);
    
    setCategoriesOrder(newOrder);
    setDraggedIndex(index);
    setHasOrderChanged(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedIndex(null);
  };

  const resetOrderChange = () => {
    setHasOrderChanged(false);
  };

  return {
    isDragging,
    draggedIndex,
    categoriesOrder,
    hasOrderChanged,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrderChange,
  };
};
