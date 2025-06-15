
import { ProductFormValues } from '@/hooks/useProductForm';
import { uploadProductImage } from '@/utils/imageUtils';

/**
 * Updates an existing product
 * @param id Product ID
 * @param productData Updated product data from form
 * @param imageFile New image file to upload (can be File or URL string)
 * @returns Updated product or null if failed
 */
export const updateProduct = async (
  id: string,
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<any> => {
  try {
    let imageUrl = productData.imageUrl || '';
    if (imageFile && imageFile instanceof File) {
      try {
        imageUrl = await uploadProductImage(imageFile, id);
      } catch (imageError) {
        imageUrl = productData.imageUrl || '';
      }
    } else if (typeof imageFile === 'string') {
      imageUrl = imageFile;
    }
    const dbUpdates = {
      ...productData,
      imageUrl
    };
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdates)
    });
    if (!res.ok) throw new Error('Ошибка обновления продукта');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const updateProductFields = async (
  id: string, 
  updates: { available?: boolean; [key: string]: any }
): Promise<any> => {
  try {
    const dbUpdates: any = { ...updates };
    if (dbUpdates.imageUrl && !dbUpdates.imageurl) {
      dbUpdates.imageurl = dbUpdates.imageUrl;
      delete dbUpdates.imageUrl;
    }
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdates)
    });
    if (!res.ok) throw new Error('Ошибка обновления продукта');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error updating product fields:', error);
    throw error;
  }
};
