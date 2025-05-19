
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as categoryService from '@/services/categoryService';
import { uploadCategoryImage } from '@/utils/imageUtils';
import { Category } from '@/types/product';

export const useCategoryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: { name: string; slug: string; imageUrl?: string; order?: number }) => {
      let imageUrl: string | undefined = categoryData.imageUrl;
      
      // Only upload image if fileForCategory is a File object
      if (fileForCategory instanceof File) {
        try {
          imageUrl = await uploadCategoryImage(fileForCategory);
          categoryData.imageUrl = imageUrl;
        } catch (error) {
          console.error('Error uploading category image:', error);
          // Continue without image if upload fails
        }
      }
      
      return categoryService.addCategory(categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const updateCategoryOrderMutation = useMutation({
    mutationFn: (categories: { id: string; order: number }[]) => {
      return categoryService.updateCategoriesOrder(categories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Порядок категорий обновлен',
        description: 'Порядок категорий успешно сохранен',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить порядок категорий: ${error}`,
        variant: 'destructive',
      });
    },
  });

  const handleUpdateCategoriesOrder = (categories: Category[]) => {
    const orderUpdates = categories.map((cat, index) => ({
      id: cat.id,
      order: index,
    }));
    
    updateCategoryOrderMutation.mutate(orderUpdates);
  };

  const handleAddCategory = async (payload: { name: string; slug: string; imageUrl?: string }) => {
    try {
      let imageUrl = payload.imageUrl;
      
      // Only upload image if fileForCategory is a File object
      if (fileForCategory instanceof File) {
        try {
          imageUrl = await uploadCategoryImage(fileForCategory);
        } catch (error) {
          console.error('Error uploading category image:', error);
          // Continue without image if upload fails
        }
      }
      
      // Get all categories to determine the next order value
      const allCategories = await categoryService.getCategories();
      const maxOrder = allCategories.reduce((max, cat) => Math.max(max, cat.order || 0), -1);
      
      const newCategory = await categoryService.addCategory({
        name: payload.name,
        slug: payload.slug,
        imageUrl: imageUrl || '',
        order: maxOrder + 1, // Add new categories at the end
      });
      
      if (newCategory) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        setShowCategoryInput(false);
        setNewCategoryName('');
        setFileForCategory(null);
        
        toast({
          title: 'Категория добавлена',
          description: 'Новая категория успешно добавлена',
        });
        
        return newCategory;
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    }
    return null;
  };

  return {
    showCategoryInput,
    setShowCategoryInput,
    newCategoryName,
    setNewCategoryName,
    fileForCategory,
    setFileForCategory,
    addCategoryMutation,
    updateCategoryOrderMutation,
    handleAddCategory,
    handleUpdateCategoriesOrder,
  };
};
