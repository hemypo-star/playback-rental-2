
import { Category } from '@/types/product';

export const getCategories = async (): Promise<Category[]> => {
  try {
    console.log('Fetching categories from API...');
    const response = await fetch('/api/categories', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Categories API response:', result);
    
    // Handle both direct data and wrapped response
    const categories = result.data || result;
    
    return categories.map((category: any) => ({
      id: category.id || category.category_id?.toString(),
      category_id: category.category_id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl || category.imageurl,
      order: category.order || 0
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const categories = await getCategories();
    return categories.find(cat => cat.id === id || cat.category_id?.toString() === id) || null;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
};
