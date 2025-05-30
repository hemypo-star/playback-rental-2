
import { useState, useEffect } from 'react';
import ImageUploadField from "@/components/ImageUploadField";
import ProductFormField from './ProductFormField';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from '@/hooks/useProductForm';

type ProductImageFieldProps = {
  form: UseFormReturn<ProductFormValues>;
  imageForProduct: File | string | null;
  setImageForProduct: (file: File | string | null) => void;
  isCheckingStorage: boolean;
  isSubmitting: boolean;
};

export default function ProductImageField({
  form,
  imageForProduct,
  setImageForProduct,
  isCheckingStorage,
  isSubmitting
}: ProductImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Set up preview URL from image file or direct URL
  useEffect(() => {
    if (typeof imageForProduct === 'string') {
      setPreviewUrl(imageForProduct);
    } else if (imageForProduct instanceof File) {
      setPreviewUrl(URL.createObjectURL(imageForProduct));
    } else {
      // If no new image is selected, use the existing URL from form
      setPreviewUrl(form.getValues('imageUrl') || null);
    }
    
    return () => {
      // Clean up object URL if it was created
      if (imageForProduct instanceof File && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [imageForProduct, form]);

  const handleImageChange = (file: File | string) => {
    console.log("New image selected:", typeof file === 'string' ? 'URL: ' + file : 'File: ' + file.name);
    setImageForProduct(file);
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
          disabled={isSubmitting || isCheckingStorage}
        />
        <input type="hidden" {...form.register("imageUrl")} />
      </div>
    </ProductFormField>
  );
}
