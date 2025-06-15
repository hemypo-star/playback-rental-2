
import { Product } from '@/types/product';

/**
 * Gets all products from the database (for admin use)
 * @returns Array of all products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Ошибка загрузки продуктов');
    const data = await res.json();
    return data.map((product: any) => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: product.category_id
    })) || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

/**
 * Gets only available products from the database (for catalog use)
 * @returns Array of available products
 */
export const getAvailableProductsOnly = async (): Promise<Product[]> => {
  try {
    const res = await fetch('/api/products?available=true');
    if (!res.ok) throw new Error('Ошибка загрузки доступных продуктов');
    const data = await res.json();
    return data.map((product: any) => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: product.category_id
    })) || [];
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

/**
 * Gets a product by ID
 * @param id Product ID
 * @returns Product or null if not found
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Ошибка загрузки продукта');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};
