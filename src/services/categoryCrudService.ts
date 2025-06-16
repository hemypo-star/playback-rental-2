
import { Category } from '@/types/product';

const API_BASE = '/api/categories';

export const addCategory = async (categoryData: {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  order?: number;
}): Promise<Category> => {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(categoryData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<Category> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(categoryData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    console.log('=== DELETE CATEGORY SERVICE START ===');
    console.log('deleteCategory called with ID:', id);
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Delete response status:', response.status);
    console.log('Delete response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Delete response data:', result);
    console.log('=== DELETE CATEGORY SERVICE SUCCESS ===');
    
    return result.success !== false;
  } catch (error) {
    console.error('=== DELETE CATEGORY SERVICE ERROR ===');
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const updateCategoriesOrder = async (categories: { id: string; order: number }[]): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/reorder`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ categories })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating categories order:', error);
    throw error;
  }
};

export const uploadCategoryImage = async (imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch('/api/upload/category-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.fileUrl || result.url;
  } catch (error) {
    console.error('Error uploading category image:', error);
    throw error;
  }
};
