
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/services/supabaseService';
import { uploadCategoryImage } from '@/utils/imageUtils';

export const useCategoryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: { name: string; slug: string; imageUrl?: string }) => {
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
      
      return supabaseService.addCategory(categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

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
      
      const newCategory = await supabaseService.addCategory({
        name: payload.name,
        slug: payload.slug,
        imageUrl: imageUrl || '',
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
    handleAddCategory,
  };
};
