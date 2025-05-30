
import { useState, useEffect } from 'react';
import ImageUploadField from "@/components/ImageUploadField";
import ProductFormField from './ProductFormField';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from '@/hooks/useProductForm';

type ProductImageFieldProps = {
  form: UseFormReturn<ProductFormValues>;
  imageForProduct: string | null;
  setImageForProduct: (url: string | null) => void;
  isSubmitting: boolean;
};

export default function ProductImageField({
  form,
  imageForProduct,
  setImageForProduct,
  isSubmitting
}: ProductImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Set up preview URL from image URL
  useEffect(() => {
    if (imageForProduct) {
      setPreviewUrl(imageForProduct);
    } else {
      // If no image is selected, use the existing URL from form
      setPreviewUrl(form.getValues('imageUrl') || null);
    }
  }, [imageForProduct, form]);

  const handleImageChange = (url: string) => {
    console.log("New image URL selected:", url);
    setImageForProduct(url);
    // Update form field as well
    form.setValue('imageUrl', url);
  };

  return (
    <ProductFormField
      form={form}
      name="imageUrl"
      label="Изображение"
    >
      <div>
        <ImageUploadField
          onChange={handleImageChange}
          previewUrl={previewUrl}
          disabled={isSubmitting}
        />
        <input type="hidden" {...form.register("imageUrl")} />
      </div>
    </ProductFormField>
  );
}
