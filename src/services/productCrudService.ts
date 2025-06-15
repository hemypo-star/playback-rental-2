import { Product } from '@/types/product';
import { ProductFormValues } from '@/hooks/useProductForm';
import { supabase } from '@/integrations/supabase/client';
import { uploadProductImage } from '@/utils/imageUtils';
import { pgQuery } from '@/integrations/postgres/client';

/**
 * Gets all products from the database (for admin use)
 * @returns Array of all products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const rows = await pgQuery("SELECT * FROM products ORDER BY title ASC");
    return rows.map((row) => ({
      ...row,
      imageUrl: row.imageurl,
      category_id: row.category_id,
    }));
  } catch (err) {
    console.error('[PG] Error getting products:', err);
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
      category_id: data.category_id || parseInt(data.category) || 1 // Use category_id, fallback to parsed category, default to 1
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

/**
 * Creates a new product
 * @param productData Product data from form
 * @param imageFile Image file to upload (can be File or URL string)
 * @returns Created product or throws error
 */
export const createProduct = async (
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<Product> => {
  try {
    console.log('Creating product with data:', productData);
    console.log('Image file:', imageFile);

    let imageUrl = '';
    
    // Handle image upload if provided
    if (imageFile) {
      try {
        imageUrl = await uploadProductImage(imageFile);
        console.log('Image uploaded successfully:', imageUrl);
      } catch (imageError) {
        console.error('Failed to upload image:', imageError);
        // Continue with product creation even if image upload fails
        imageUrl = '';
      }
    }

    // Prepare data for database insertion - map frontend format to database format
    const dbData = {
      title: productData.title,
      description: productData.description || '',
      price: productData.price,
      category: productData.category_id.toString(), // Convert number to string for legacy category column
      category_id: productData.category_id, // Use new category_id column
      imageurl: imageUrl,
      quantity: productData.quantity || 1,
      available: productData.available ?? true
    };

    console.log('Inserting product into database:', dbData);

    const { data, error } = await supabase
      .from('products')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Database error creating product:', error);
      throw error;
    }

    console.log('Product created successfully:', data);

    // Map database response back to frontend format
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: data.category_id
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Updates an existing product
 * @param id Product ID
 * @param productData Updated product data from form
 * @param imageFile New image file to upload (can be File or URL string)
 * @returns Updated product or throws error
 */
export const updateProduct = async (
  id: string,
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<Product> => {
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
