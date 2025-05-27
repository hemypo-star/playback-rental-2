import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCategoryManagementHooks } from './CategoryManagementHooks';

export const useCategoryActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { deleteCategoryMutation } = useCategoryManagementHooks();

  const handleDelete = async (id: string) => {
    console.log('=== DELETE OPERATION START ===');
    console.log('handleDelete called with ID:', id);
    console.log('Category ID type:', typeof id);
    console.log('Category ID length:', id.length);
    
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      console.log('User confirmed deletion');
      console.log('Mutation pending state before call:', deleteCategoryMutation.isPending);
      
      try {
        console.log('Calling deleteCategoryMutation.mutateAsync with ID:', id);
        const result = await deleteCategoryMutation.mutateAsync(id);
        console.log('Mutation completed successfully, result:', result);
        console.log('=== DELETE OPERATION SUCCESS ===');
      } catch (error) {
        console.error('=== DELETE OPERATION FAILED ===');
        console.error('Error in handleDelete:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        // Error handling is already done in the mutation
      }
    } else {
      console.log('User cancelled deletion');
      console.log('=== DELETE OPERATION CANCELLED ===');
    }
  };

  const handleAddNewCategory = async ({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string }, fileForCategory: File | null) => {
    try {
      if (!name.trim()) {
        toast({
          title: "Ошибка",
          description: "Название категории не может быть пустым",
          variant: "destructive",
        });
        return false;
      }
      
      let finalImageUrl = imageUrl || '';
      
      if (fileForCategory) {
        try {
          const { uploadCategoryImage } = await import('@/services/categoryService');
          finalImageUrl = await uploadCategoryImage(fileForCategory);
          console.log("Uploaded image URL:", finalImageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить изображение",
            variant: "destructive",
          });
        }
      }
      
      const { addCategory } = await import('@/services/categoryService');
      await addCategory({
        name,
        slug,
        description: '',
        imageUrl: finalImageUrl,
      });
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория добавлена',
        description: 'Категория успешно добавлена.'
      });
      
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось добавить категорию: ${error}`,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    handleDelete,
    handleAddNewCategory,
    isDeleting: deleteCategoryMutation.isPending,
  };
};
