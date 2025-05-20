
import { useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useProductManagement } from '@/hooks/useProductManagement';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';
import { useStorageStatus } from '@/hooks/useStorageStatus';
import ProductActions from '@/components/admin/products/ProductActions';
import ProductTabs from '@/components/admin/products/ProductTabs';
import InitializeStorage from '@/components/admin/InitializeStorage';
import { ProductFormValues } from '@/hooks/useProductManagement';

const AdminProducts = () => {
  const {
    products,
    categories,
    isLoadingProducts,
    openDialog,
    setOpenDialog,
    editProduct,
    setEditProduct,
    imageForProduct,
    setImageForProduct,
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
    handleEditProduct,
    handleDeleteProduct,
  } = useProductManagement();

  const {
    showCategoryInput,
    setShowCategoryInput,
    newCategoryName,
    setNewCategoryName,
    fileForCategory,
    setFileForCategory,
    addCategoryMutation,
    handleAddCategory,
  } = useCategoryManagement();

  const {
    storageInitialized,
    handleStorageInitialized
  } = useStorageStatus();

  const onSubmit = async (formData: ProductFormValues, imageFile: File | string | null) => {
    if (!editProduct) return;
    
    setImageForProduct(imageFile);
  
    try {
      await updateProductMutation.mutateAsync({
        id: editProduct.id,
        data: {
          ...formData,
          imageFile: imageFile instanceof File ? imageFile : undefined
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении товара:', error);
    }
  };

  // State to control which section is visible
  const [activeTab, setActiveTab] = useState<'products' | 'import-export'>('products');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Управление товарами</h2>
        <div className="flex gap-2">
          <ProductActions
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
            editProduct={editProduct}
            categories={categories || []}
            showCategoryInput={showCategoryInput}
            setShowCategoryInput={setShowCategoryInput}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            fileForProduct={imageForProduct}
            setFileForProduct={setImageForProduct}
            fileForCategory={fileForCategory}
            setFileForCategory={setFileForCategory}
            addCategoryMutation={addCategoryMutation}
            onSubmit={onSubmit}
            handleAddCategory={handleAddCategory}
            createPending={createProductMutation?.isPending}
            updatePending={updateProductMutation?.isPending}
          />
        </div>
      </div>

      <InitializeStorage onComplete={handleStorageInitialized} />

      {storageInitialized === false && (
        <Alert variant="destructive">
          <AlertTitle>Storage initialization problem</AlertTitle>
          <AlertDescription>
            There are issues with storage initialization. You may have problems uploading or displaying images.
            Try reloading the page or contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      <ProductTabs
        products={products}
        isLoading={isLoadingProducts}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        updateMutation={updateProductMutation}
      />
    </div>
  );
};

export default AdminProducts;
