
import { Category } from '@/types/product';

/**
 * API base URL for categories (adjust as needed for your backend)
 */
const API_URL = '/api/categories';

/** GET all categories */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Ошибка загрузки категорий');
    const data = await res.json();
    // Ensure mapping if needed (e.g., imageurl → imageUrl)
    return data.map((cat: any) => ({
      ...cat,
      imageUrl: cat.imageurl,
      order: cat.order || 0,
      category_id: cat.category_id
    })) || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Ошибка загрузки категории');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
};

export const getCategoryByName = async (name: string): Promise<Category | null> => {
  try {
    // API endpoint should accept query param or search
    const res = await fetch(`${API_URL}?name=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error getting category by name:', error);
    return null;
  }
};

export const addCategory = async (categoryData: Partial<Category>): Promise<Category | null> => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
    if (!res.ok) throw new Error('Ошибка при создании категории');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error adding category:', error);
    return null;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Ошибка при обновлении категории');
    const data = await res.json();
    return {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

export const updateCategoriesOrder = async (categories: { id: string, order: number }[]): Promise<boolean> => {
  try {
    // POST batch order updates
    const res = await fetch(`${API_URL}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories)
    });
    return res.ok;
  } catch (error) {
    console.error('Error updating categories order:', error);
    return false;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

export const uploadCategoryImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-category', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Ошибка загрузки изображения');
    const data = await res.json();
    return data.url; // assumes { url: string }
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
