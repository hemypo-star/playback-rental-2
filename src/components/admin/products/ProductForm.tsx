
import { useState } from "react";
import { Form } from "@/components/ui/form";
import { Product, Category } from "@/types/product";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import CategoryField from "./CategoryField";
import FormActions from "./FormActions";
import StorageStatusAlert from "./StorageStatusAlert";
import ProductFormField from "./ProductFormField";
import ProductImageField from "./ProductImageField";
import { useProductForm, ProductFormValues } from "@/hooks/useProductForm";
import { useStorageStatus } from "@/hooks/useStorageStatus";

type ProductFormProps = {
  editProduct: Product | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues, imageFile: File | string | null) => void;
  onCancel: () => void;
};

export default function ProductForm({
  editProduct,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast();
  const [imageForProduct, setImageForProduct] = useState<File | string | null>(null);
  const { 
    storageInitialized, 
    storageError,
    isCheckingStorage, 
    checkStorageConnection 
  } = useStorageStatus();

  const handleSubmitWithImage = (values: ProductFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Image for product:", imageForProduct);
    
    // For external URLs, check if storage is needed
    const needsStorage = imageForProduct && imageForProduct instanceof File;
    
    // Check if the storage buckets are ready (only if we're uploading a file)
    if (needsStorage && !storageInitialized) {
      toast({
        title: 'Предупреждение',
        description: 'Хранилище для изображений не готово. Изображение может не быть загружено.',
        variant: 'warning',
      });
    }
    
    onSubmit(values, imageForProduct);
  };

  const { 
    form,
    showCategoryInput,
    setShowCategoryInput,
    newCategoryName,
    setNewCategoryName,
    isAddingCategory,
    handleNewCategory,
    handleFormSubmit
  } = useProductForm(editProduct, handleSubmitWithImage, setImageForProduct);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {storageError && !imageForProduct?.toString().startsWith('http') && (
          <StorageStatusAlert 
            error={storageError}
            isCheckingStorage={isCheckingStorage}
            onCheckStorage={checkStorageConnection}
          />
        )}

        <ProductFormField 
          form={form}
          name="title"
          label="Название"
        >
          <Input />
        </ProductFormField>

        <ProductFormField 
          form={form}
          name="description"
          label="Описание"
        >
          <Textarea />
        </ProductFormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductFormField 
            form={form}
            name="price"
            label="Цена (₽)"
          >
            <Input type="number" />
          </ProductFormField>

          <ProductFormField 
            form={form}
            name="quantity"
            label="Количество"
          >
            <Input type="number" />
          </ProductFormField>
        </div>

        <CategoryField 
          form={form}
          categories={categories}
          showCategoryInput={showCategoryInput}
          setShowCategoryInput={setShowCategoryInput}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          handleNewCategory={handleNewCategory}
          isAddingCategory={isAddingCategory}
        />

        <ProductImageField
          form={form}
          imageForProduct={imageForProduct}
          setImageForProduct={setImageForProduct}
          isCheckingStorage={isCheckingStorage}
          isSubmitting={isSubmitting}
        />

        <ProductFormField 
          form={form}
          name="available"
          label="Доступность"
          description="Товар доступен для бронирования"
        >
          <Switch />
        </ProductFormField>
        
        <FormActions 
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}

// Export the schema and types for use in other components
export { productFormSchema } from '@/hooks/useProductForm';
export type { ProductFormValues } from '@/hooks/useProductForm';
