
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProductEditDialog from '@/components/admin/products/ProductEditDialog';
import { ProductFormValues, productFormSchema } from '@/hooks/useProductForm';
import { Product } from '@/types/product';
import { UseMutationResult } from '@tanstack/react-query';

type ProductActionsProps = {
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
  editProduct: Product | null;
  categories: any[];
  showCategoryInput: boolean;
  setShowCategoryInput: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  fileForProduct: string | null;
  setFileForProduct: (url: string | null) => void;
  fileForCategory: string | null;
  setFileForCategory: (file: string | null) => void;
  addCategoryMutation: UseMutationResult<any, unknown, any, unknown>;
  onSubmit: (values: ProductFormValues, imageUrl: string | null) => void;
  handleAddCategory: (values: any) => void;
  createPending: boolean;
  updatePending: boolean;
};

export default function ProductActions({
  openDialog,
  setOpenDialog,
  editProduct,
  categories,
  showCategoryInput,
  setShowCategoryInput,
  newCategoryName,
  setNewCategoryName,
  fileForProduct,
  setFileForProduct,
  fileForCategory,
  setFileForCategory,
  addCategoryMutation,
  onSubmit,
  handleAddCategory,
  createPending,
  updatePending,
}: ProductActionsProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category_id: 0,
      imageUrl: '',
      quantity: 1,
      available: true,
    },
  });

  return (
    <ProductEditDialog
      open={openDialog}
      setOpen={setOpenDialog}
      editProduct={editProduct}
      form={form}
      categories={categories || []}
      showCategoryInput={showCategoryInput}
      setShowCategoryInput={setShowCategoryInput}
      newCategoryName={newCategoryName}
      setNewCategoryName={setNewCategoryName}
      imageForProduct={fileForProduct}
      setImageForProduct={setFileForProduct}
      fileForCategory={fileForCategory}
      setFileForCategory={setFileForCategory}
      addCategoryMutation={addCategoryMutation}
      onSubmit={onSubmit}
      handleAddCategory={handleAddCategory}
      createPending={createPending}
      updatePending={updatePending}
    />
  );
}
