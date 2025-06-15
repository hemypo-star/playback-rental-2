
import { ProductFormValues } from '@/hooks/useProductForm';
import { uploadProductImage } from '@/utils/imageUtils';

/**
 * Creates a new product
 * @param productData Product data from form
 * @param imageFile Image file to upload (can be File or URL string)
 * @returns Created product or null if failed
 */
export const createProduct = async (
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<any> => {
  try {
    let imageUrl = '';
    if (imageFile) {
      try {
        imageUrl = await uploadProductImage(imageFile);
      } catch (imageError) {
        imageUrl = '';
      }
    }
    const dbData = {
      ...productData,
      imageUrl
    };
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbData)
    });
    if (!res.ok) throw new Error('Не удалось создать продукт');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};
