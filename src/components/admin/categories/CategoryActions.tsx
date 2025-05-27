
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCategoryManagementHooks } from './CategoryManagementHooks';

export const useCategoryActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { deleteCategoryMutation } = useCategoryManagementHooks();

  const handleDelete = async (id: string) => {
    console.log('handleDelete called with ID:', id);
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      console.log('User confirmed deletion, calling mutation');
      try {
        await deleteCategoryMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error in handleDelete:', error);
        // Error handling is already done in the mutation
      }
    } else {
      console.log('User cancelled deletion');
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
