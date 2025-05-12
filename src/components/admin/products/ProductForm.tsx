
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product } from "@/types/product";
import { Form } from "@/components/ui/form";
import { useState } from "react";
import StorageStatusAlert from "./StorageStatusAlert";
import ProductFormFields from "./ProductFormFields";
import FormActions from "./FormActions";
import useStorageStatus from "./useStorageStatus";

export const productFormSchema = z.object({
  title: z.string().min(2, {
    message: 'Название должно содержать минимум 2 символа',
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(1, {
    message: 'Цена должна быть больше 0',
  }),
  category: z.string().min(1, {
    message: 'Выберите категорию',
  }),
  imageUrl: z.string().optional(),
  quantity: z.coerce.number().min(1, {
    message: 'Количество должно быть больше 0',
  }),
  available: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormProps = {
  editProduct: Product | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues, imageFile: File | string | null) => void;
  onCancel: () => void;
};

import { Category } from "@/types/product";
import { useToast } from "@/hooks/use-toast";

export default function ProductForm({
  editProduct,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast();
  const [imageForProduct, setImageForProduct] = useState<File | string | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const { storageStatus, isCheckingStorage, checkStorageConnection } = useStorageStatus();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: editProduct?.title || '',
      description: editProduct?.description || '',
      price: editProduct?.price || 0,
      category: editProduct?.category || '',
      imageUrl: editProduct?.imageUrl || '',
      quantity: editProduct?.quantity || 1,
      available: editProduct?.available ?? true,
    },
  });

  const handleNewCategory = async () => {
    setIsAddingCategory(true);
    try {
      if (!newCategoryName.trim()) {
        toast({
          title: 'Ошибка',
          description: 'Введите название категории',
          variant: 'destructive',
        });
        return;
      }

      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      
      // This would typically call a prop function to add the category
      // For now we'll just update the form state
      form.setValue('category', newCategoryName);
      setShowCategoryInput(false);
      setNewCategoryName('');
      
      toast({
        title: 'Категория добавлена',
        description: 'Новая категория успешно добавлена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleFormSubmit = (values: ProductFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Image for product:", imageForProduct);
    
    // For external URLs, check if storage is needed
    const needsStorage = imageForProduct && typeof imageForProduct !== 'string';
    
    // Check if the storage buckets are ready (only if we're uploading a file)
    if (needsStorage && !storageStatus.initialized) {
      toast({
        title: 'Предупреждение',
        description: 'Хранилище для изображений не готово. Изображение может не быть загружено.',
        variant: 'warning',
      });
    }
    
    onSubmit(values, imageForProduct);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {storageStatus.error && !imageForProduct?.toString().startsWith('http') && (
          <StorageStatusAlert 
            error={storageStatus.error}
            isCheckingStorage={isCheckingStorage}
            onCheckStorage={checkStorageConnection}
          />
        )}

        <ProductFormFields 
          form={form}
          categories={categories}
          isSubmitting={isSubmitting}
          isCheckingStorage={isCheckingStorage}
          showCategoryInput={showCategoryInput}
          setShowCategoryInput={setShowCategoryInput}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          handleNewCategory={handleNewCategory}
          isAddingCategory={isAddingCategory}
          setImageForProduct={setImageForProduct}
          imageForProduct={imageForProduct}
        />
        
        <FormActions 
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}
