
import { supabase } from '@/integrations/supabase/client';
import { ProductFormValues } from '@/hooks/useProductForm';
import { uploadProductImage } from '@/utils/imageUtils';

/**
 * Updates an existing product
 * @param id Product ID
 * @param productData Updated product data from form
 * @param imageFile New image file to upload (can be File or URL string)
 * @returns Updated product or null if failed
 */
export const updateProduct = async (
  id: string,
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<any> => {
  try {
    console.log('Updating product with ID:', id);
    console.log('Update data:', productData);
    console.log('New image file:', imageFile);

    let imageUrl = productData.imageUrl || '';
    
    // Handle image upload if a new file is provided
    if (imageFile && imageFile instanceof File) {
      try {
        imageUrl = await uploadProductImage(imageFile, id);
        console.log('New image uploaded successfully:', imageUrl);
      } catch (imageError) {
        console.error('Failed to upload new image:', imageError);
        // Use existing image URL if new upload fails
        imageUrl = productData.imageUrl || '';
      }
    } else if (typeof imageFile === 'string') {
      // Use provided URL string
      imageUrl = imageFile;
    }

    // Prepare data for database update - map frontend format to database format
    const dbUpdates = {
      title: productData.title,
      description: productData.description || '',
      price: productData.price,
      category: productData.category_id.toString(), // Convert number to string for legacy category column
      category_id: productData.category_id, // Use new category_id column
      imageurl: imageUrl,
      quantity: productData.quantity || 1,
      available: productData.available ?? true
    };

    console.log('Updating product in database:', dbUpdates);

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating product:', error);
      throw error;
    }

    console.log('Product updated successfully:', data);

    // Map database response back to frontend format
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Updates specific fields of a product (for quick updates like availability)
 * @param id Product ID
 * @param updates Partial product data to update
 * @returns Updated product or null if failed
 */
export const updateProductFields = async (
  id: string, 
  updates: { available?: boolean; [key: string]: any }
): Promise<any> => {
  try {
    console.log('Updating product fields for ID:', id);
    console.log('Field updates:', updates);

    // Prepare database updates, mapping frontend format to database format where needed
    const dbUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      if (key === 'imageUrl') {
        dbUpdates.imageurl = updates[key];
      } else if (key === 'category_id') {
        dbUpdates.category_id = updates[key];
        dbUpdates.category = updates[key]?.toString(); // Also update legacy category column
      } else {
        dbUpdates[key] = updates[key];
      }
    });

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating product fields:', error);
      throw error;
    }

    console.log('Product fields updated successfully:', data);

    // Map database response back to frontend format
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error updating product fields:', error);
    throw error;
  }
};
