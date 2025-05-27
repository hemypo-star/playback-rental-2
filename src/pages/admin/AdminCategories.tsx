import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/types/product';
import * as categoryService from '@/services/categoryService';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';
import AdminCategoriesHeader from '@/components/admin/categories/AdminCategoriesHeader';
import CategoryEditDialog from '@/components/admin/categories/CategoryEditDialog';
import CategoryList from '@/components/admin/categories/CategoryList';
import CategoryLoadingSkeleton from '@/components/admin/categories/CategoryLoadingSkeleton';

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
  }>({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [categoriesOrder, setCategoriesOrder] = useState<Category[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  const {
    handleAddCategory,
    handleUpdateCategoriesOrder,
    updateCategoryOrderMutation,
  } = useCategoryManagement();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
  });

  // Update categoriesOrder when categories data changes, but only if order hasn't been modified
  useEffect(() => {
    if (categories && !hasOrderChanged) {
      setCategoriesOrder(categories);
    }
  }, [categories, hasOrderChanged]);

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: Partial<Category>) => {
      let imageUrl = formData.imageUrl;
      
      if (uploadType === 'file' && imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(imageFile);
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
      setOpenDialog(false);
      resetForm();
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
    mutationFn: async (category: Partial<Category>) => {
      let imageUrl = formData.imageUrl;
      
      if (uploadType === 'file' && imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(imageFile);
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
      setOpenDialog(false);
      resetForm();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'name' && (!formData.slug || formData.slug === '')) {
      setFormData((prev) => ({
        ...prev,
        slug: value.toLowerCase().replace(/\s+/g, '-'),
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      imageUrl: uploadType === 'url' ? formData.imageUrl : '',
    };
    
    if (editCategory) {
      updateCategoryMutation.mutate({ ...categoryData, id: editCategory.id });
    } else {
      addCategoryMutation.mutate(categoryData);
    }
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
    });
    setImagePreview(category.imageUrl || '');
    setUploadType(category.imageUrl?.startsWith('http') ? 'url' : 'file');
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    console.log('handleDelete called with ID:', id);
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      console.log('User confirmed deletion, calling mutation');
      try {
        await deleteCategoryMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error in handleDelete:', error);
      }
    } else {
      console.log('User cancelled deletion');
    }
  };

  const resetForm = () => {
    setEditCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
    setUploadType('file');
    setNewCategoryName('');
    setFileForCategory(null);
  };

  const handleAddNewCategory = async ({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string }) => {
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
          finalImageUrl = await categoryService.uploadCategoryImage(fileForCategory);
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
      
      await categoryService.addCategory({
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
      
      setNewCategoryName('');
      setFileForCategory(null);
      setShowAddSection(false);
      
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

  const handleSaveOrder = () => {
    handleUpdateCategoriesOrder(categoriesOrder);
  };

  return (
    <div className="space-y-6">
      <AdminCategoriesHeader
        hasOrderChanged={hasOrderChanged}
        onSaveOrder={handleSaveOrder}
        updateCategoryOrderMutation={updateCategoryOrderMutation}
        showAddSection={showAddSection}
        setShowAddSection={setShowAddSection}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        fileForCategory={fileForCategory}
        setFileForCategory={setFileForCategory}
        onAddCategory={handleAddNewCategory}
        addCategoryMutation={addCategoryMutation}
      />

      {isLoading ? (
        <CategoryLoadingSkeleton />
      ) : (
        <CategoryList
          categories={categoriesOrder}
          isDragging={isDragging}
          draggedIndex={draggedIndex}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      
      <CategoryEditDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        editCategory={editCategory}
        onSubmit={handleSubmit}
        formData={formData}
        onInputChange={handleInputChange}
        uploadType={uploadType}
        onUploadTypeChange={setUploadType}
        imagePreview={imagePreview}
        onFileChange={handleFileChange}
        onCancel={() => {
          setOpenDialog(false);
          resetForm();
        }}
        isSubmitting={addCategoryMutation.isPending || updateCategoryMutation.isPending}
      />
    </div>
  );
};

export default AdminCategories;
