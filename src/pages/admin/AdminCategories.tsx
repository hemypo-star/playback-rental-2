
import { useQuery } from '@tanstack/react-query';
import { Category } from '@/types/product';
import * as categoryService from '@/services/categoryService';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';
import { useCategoryFormState } from '@/components/admin/categories/CategoryFormState';
import { useCategoryDragDrop } from '@/components/admin/categories/CategoryDragDropHandler';
import { useCategoryManagementHooks } from '@/components/admin/categories/CategoryManagementHooks';
import { useCategoryActions } from '@/components/admin/categories/CategoryActions';
import AdminCategoriesHeader from '@/components/admin/categories/AdminCategoriesHeader';
import CategoryEditDialog from '@/components/admin/categories/CategoryEditDialog';
import CategoryList from '@/components/admin/categories/CategoryList';
import CategoryLoadingSkeleton from '@/components/admin/categories/CategoryLoadingSkeleton';

const AdminCategories = () => {
  const {
    handleUpdateCategoriesOrder,
    updateCategoryOrderMutation,
  } = useCategoryManagement();

  const {
    openDialog,
    setOpenDialog,
    editCategory,
    showAddSection,
    setShowAddSection,
    newCategoryName,
    setNewCategoryName,
    fileForCategory,
    setFileForCategory,
    formData,
    imageFile,
    imagePreview,
    uploadType,
    setUploadType,
    handleInputChange,
    handleFileChange,
    resetForm,
    handleEdit,
  } = useCategoryFormState();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
  });

  const {
    isDragging,
    draggedIndex,
    categoriesOrder,
    hasOrderChanged,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrderChange,
  } = useCategoryDragDrop(categories);

  const {
    addCategoryMutation,
    updateCategoryMutation,
  } = useCategoryManagementHooks();

  const {
    handleDelete,
    handleAddNewCategory,
    isDeleting,
  } = useCategoryActions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      imageUrl: uploadType === 'url' ? formData.imageUrl : '',
      uploadType,
      imageFile,
    };
    
    if (editCategory) {
      updateCategoryMutation.mutate({ ...categoryData, id: editCategory.id });
    } else {
      addCategoryMutation.mutate(categoryData);
    }
    
    if (!updateCategoryMutation.isError && !addCategoryMutation.isError) {
      setOpenDialog(false);
      resetForm();
    }
  };

  const handleSaveOrder = () => {
    handleUpdateCategoriesOrder(categoriesOrder);
    resetOrderChange();
  };

  const handleAddCategoryWrapper = async (payload: { name: string; slug: string; imageUrl?: string }) => {
    const success = await handleAddNewCategory(payload, fileForCategory);
    if (success) {
      setNewCategoryName('');
      setFileForCategory(null);
      setShowAddSection(false);
    }
    return success;
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
        onAddCategory={handleAddCategoryWrapper}
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
          isDeleting={isDeleting}
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
