
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gets all products from the database
 * @returns Array of products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl
    })) || [];
  } catch (error) {
    console.error('Error getting products:', error);
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
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};
