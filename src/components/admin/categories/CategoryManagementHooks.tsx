
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
      console.log('=== MUTATION FUNCTION START ===');
      console.log('Delete mutation function called with ID:', id);
      console.log('ID type in mutation:', typeof id);
      console.log('ID value in mutation:', id);
      
      console.log('Calling categoryService.deleteCategory...');
      const result = await categoryService.deleteCategory(id);
      console.log('categoryService.deleteCategory result:', result);
      console.log('Result type:', typeof result);
      
      if (!result) {
        console.error('Delete operation returned false/null');
        throw new Error('Failed to delete category - service returned false');
      }
      
      console.log('=== MUTATION FUNCTION SUCCESS ===');
      return result;
    },
    onSuccess: () => {
      console.log('=== MUTATION onSuccess TRIGGERED ===');
      console.log('Delete mutation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория удалена',
        description: 'Категория успешно удалена.'
      });
      console.log('=== MUTATION onSuccess COMPLETED ===');
    },
    onError: (error) => {
      console.error('=== MUTATION onError TRIGGERED ===');
      console.error('Delete mutation error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить категорию: ${error}`,
        variant: 'destructive',
      });
      console.error('=== MUTATION onError COMPLETED ===');
    }
  });

  return {
    addCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
  };
};
