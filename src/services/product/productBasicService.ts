
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gets all products from the database (for admin use)
 * @returns Array of all products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    
    // Map database fields to frontend format
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: product.category_id // Use the existing category_id field directly
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true); // Only get available products
    
    if (error) throw error;
    
    // Map database fields to frontend format
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: product.category_id // Use the existing category_id field directly
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
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map database fields to frontend format
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id // Use the existing category_id field directly
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};
