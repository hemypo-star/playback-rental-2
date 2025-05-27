
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/types/product';
import * as categoryService from '@/services/categoryService';

// Define the form data type for category operations
interface CategoryFormData extends Partial<Category> {
  uploadType?: 'file' | 'url';
  imageFile?: File;
}

export const useCategoryManagementHooks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryFormData) => {
      let imageUrl = categoryData.imageUrl;
      
      if (categoryData.uploadType === 'file' && categoryData.imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(categoryData.imageFile);
      }
      
      return categoryService.addCategory({
        name: categoryData.name!,
        slug: categoryData.slug,
        description: categoryData.description,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория добавлена',
        description: 'Категория успешно добавлена.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: CategoryFormData) => {
      let imageUrl = category.imageUrl;
      
      if (category.uploadType === 'file' && category.imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(category.imageFile);
      }
      
      return categoryService.updateCategory(category.id!, {
        ...category,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория обновлена',
        description: 'Категория успешно обновлена.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Attempting to delete category with ID:', id);
      const result = await categoryService.deleteCategory(id);
      console.log('Delete result:', result);
      if (!result) {
        throw new Error('Failed to delete category');
      }
      return result;
    },
    onSuccess: () => {
      console.log('Delete mutation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория удалена',
        description: 'Категория успешно удалена.'
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  return {
    addCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
  };
};
