
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { uploadProductImage } from '@/utils/imageUtils';
import { getProductById } from './productBasicService';

/**
 * Updates an existing product
 * @param id Product ID
 * @param updates Product data to update
 * @param imageFile Image file or URL
 * @returns Updated product or null if update failed
 */
export const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Updating product:", id, "with updates:", updates, "and image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    // If there's an image (file or URL), handle it appropriately
    let fileName = null;
    if (imageFile) {
      console.log("Processing new image for product:", id);
      try {
        if (typeof imageFile === 'string') {
          fileName = imageFile; // Use the URL directly
          console.log("Using external URL for image:", fileName);
        } else {
          fileName = await uploadProductImage(imageFile, id);
          console.log("Image uploaded, filename:", fileName);
        }
      } catch (uploadError) {
        console.error("Error with image:", uploadError);
        // Continue with the update even if the image handling fails
      }
    }
    
    // Make sure we're using imageurl for the database column
    const dbUpdates: Record<string, any> = {};
    
    // Copy specific updated properties to dbUpdates
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category_id !== undefined) dbUpdates.category = updates.category_id.toString();
    if (updates.available !== undefined) dbUpdates.available = updates.available;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (fileName !== null) dbUpdates.imageurl = fileName;
    else if (updates.imageUrl !== undefined) dbUpdates.imageurl = updates.imageUrl;
    
    // Check if there's anything to update
    if (Object.keys(dbUpdates).length === 0) {
      console.log("No updates to apply, returning existing product");
      return getProductById(id);
    }
    
    console.log("Updating product with:", dbUpdates);
    
    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    
    console.log("Product updated:", data);
    
    // Map imageurl to imageUrl and category to category_id for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      category_id: parseInt(data.category) // Convert category string to category_id number
    } : null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};
