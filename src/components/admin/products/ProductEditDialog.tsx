
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Product, Category } from "@/types/product";
import ProductForm, { ProductFormValues } from "./ProductForm";
import { UseFormReturn } from "react-hook-form";
import { UseMutationResult } from "@tanstack/react-query";

type ProductEditDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editProduct: Product | null;
  form: UseFormReturn<any>;
  categories: Category[];
  showCategoryInput: boolean;
  setShowCategoryInput: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  fileForProduct: File | null;
  setFileForProduct: (file: File | null) => void;
  fileForCategory: File | null;
  setFileForCategory: (file: File | null) => void;
  addCategoryMutation: UseMutationResult<any, unknown, any, unknown>;
  onSubmit: (values: ProductFormValues) => void;
  handleAddCategory: (values: any) => void;
  createPending: boolean;
  updatePending: boolean;
};

export default function ProductEditDialog({
  open,
  setOpen,
  editProduct,
  categories,
  createPending,
  updatePending,
  onSubmit,
}: ProductEditDialogProps) {
  const isSubmitting = createPending || updatePending;
  
  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Добавить товар
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
          </DialogHeader>
          
          {open && (
            <ProductForm
              editProduct={editProduct}
              categories={categories || []}
              isSubmitting={isSubmitting}
              onSubmit={onSubmit}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
