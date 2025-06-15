
/**
 * Новый сервис: все операции теперь идут через ваш backend API!
 * УДАЛЕНО: любые обращения к Supabase
 * Запросы идут через обычный fetch.
 */

import { Product } from '@/types/product';
import { ProductFormValues } from '@/hooks/useProductForm';

const API_URL = '/api/products';

/**
 * Получить все продукты (для админа)
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Ошибка загрузки продуктов');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[API] Error getting products:', err);
    return [];
  }
};

/**
 * Получить продукт по id
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Ошибка загрузки продукта');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error getting product by ID:', err);
    return null;
  }
};

/**
 * Создать продукт
 */
export const createProduct = async (
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<Product> => {
  try {
    let imageUrl = '';
    // 1. Загрузка изображения через API
    if (imageFile instanceof File) {
      const uploadRes = await uploadImageToBackend(imageFile);
      imageUrl = uploadRes.url;
    } else if (typeof imageFile === 'string') {
      imageUrl = imageFile;
    }

    // 2. Сам продукт
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...productData, imageUrl }),
    });
    if (!res.ok) {
      throw new Error('Не удалось создать продукт');
    }
    return await res.json();
  } catch (err) {
    console.error('Error creating product:', err);
    throw err;
  }
};

/**
 * Обновить продукт
 */
export const updateProduct = async (
  id: string,
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<Product> => {
  try {
    let imageUrl = productData.imageUrl || '';
    if (imageFile instanceof File) {
      const uploadRes = await uploadImageToBackend(imageFile);
      imageUrl = uploadRes.url;
    } else if (typeof imageFile === 'string') {
      imageUrl = imageFile;
    }

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...productData, imageUrl }),
    });
    if (!res.ok) throw new Error('Ошибка обновления продукта');
    return await res.json();
  } catch (err) {
    console.error('Error updating product:', err);
    throw err;
  }
};

/**
 * Удалить продукт
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка удаления продукта');
    return true;
  } catch (err) {
    console.error('Error deleting product:', err);
    return false;
  }
};

/**
 * Вспомогательная функция загрузки изображений на backend
 */
const uploadImageToBackend = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Не удалось загрузить изображение');
  return await res.json();
};

