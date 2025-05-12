
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProductEditDialog from '@/components/admin/products/ProductEditDialog';
import { ProductFormValues, productFormSchema } from '@/components/admin/products/ProductForm';
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
  fileForProduct: File | string | null;
  setFileForProduct: (file: File | string | null) => void;
  fileForCategory: File | null;
  setFileForCategory: (file: File | null) => void;
  addCategoryMutation: UseMutationResult<any, unknown, any, unknown>;
  onSubmit: (values: ProductFormValues, imageFile: File | string | null) => void;
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
      category: '',
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
      fileForProduct={fileForProduct}
      setFileForProduct={setFileForProduct}
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
