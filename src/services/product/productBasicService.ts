
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
    
    // Map database fields to frontend format
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: parseInt(product.category) // Convert category string to category_id number
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
    
    // Map database fields to frontend format
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      category_id: parseInt(data.category) // Convert category string to category_id number
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};
