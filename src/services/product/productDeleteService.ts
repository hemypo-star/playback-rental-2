
import { supabase } from '@/integrations/supabase/client';

/**
 * Deletes a product by ID
 * @param id Product ID
 * @returns Success status
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};
