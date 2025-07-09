import { supabase } from '@/integrations/supabase/client';
import { ProductFormValues } from '@/hooks/useProductForm';
import { uploadProductImage } from '@/utils/imageUtils';

/**
 * Creates a new product
 * @param productData Product data from form
 * @param imageFile Image file to upload (can be File or URL string)
 * @returns Created product or null if failed
 */
export const createProduct = async (
  productData: ProductFormValues,
  imageFile?: File | string | null
): Promise<any> => {
  try {
    console.log('Creating product with data:', productData);
    console.log('Image file:', imageFile);

    let imageUrl = productData.imageUrl || '';
    
    // Handle image upload if provided
    if (imageFile && imageFile instanceof File) {
      try {
        imageUrl = await uploadProductImage(imageFile);
        console.log('Image uploaded successfully:', imageUrl);
      } catch (imageError) {
        console.error('Failed to upload image:', imageError);
        // Continue with product creation even if image upload fails
        imageUrl = productData.imageUrl || '';
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