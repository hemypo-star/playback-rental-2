import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Product, Category } from "@/types/product";
import ProductForm, { ProductFormValues } from "./ProductForm";
import { UseFormReturn } from "react-hook-form";
import { UseMutationResult } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProductEditDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editProduct: Product | null;
  form?: UseFormReturn<any>;
  categories: Category[];
  showCategoryInput?: boolean;
  setShowCategoryInput?: (show: boolean) => void;
  newCategoryName?: string;
  setNewCategoryName?: (name: string) => void;
  imageForProduct: string | null;
  setImageForProduct: (url: string | null) => void;
  fileForCategory?: File | null;
  setFileForCategory?: (file: File | null) => void;
  addCategoryMutation?: UseMutationResult<any, unknown, any, unknown>;
  onSubmit: (values: ProductFormValues, imageUrl: string | null) => void;
  handleAddCategory?: (values: any) => void;
  createPending: boolean;
  updatePending: boolean;
};

export default function ProductEditDialog({
  open,
  setOpen,
  editProduct,
  categories,
  imageForProduct,
  setImageForProduct,
  createPending,
  updatePending,
  onSubmit,
}: ProductEditDialogProps) {
  const isSubmitting = createPending || updatePending;
  
  const handleCancel = () => {
    setOpen(false);
    setImageForProduct(null);
  };

  const handleSubmit = (values: ProductFormValues) => {
    console.log("Dialog submitting form:", values);
    onSubmit(values, imageForProduct);
  };

  const handleOpenDialog = () => {
    console.log("Opening product dialog for:", editProduct ? 'edit' : 'create');
    setOpen(true);
  };

  return (
    <div>
      <Button onClick={handleOpenDialog}>
        <Plus className="mr-2 h-4 w-4" /> Добавить товар
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
          </DialogHeader>
          
          {open && (
            <ScrollArea className="max-h-[70vh]">
              <div className="pr-4">
                <ProductForm
                  editProduct={editProduct}
                  categories={categories || []}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
