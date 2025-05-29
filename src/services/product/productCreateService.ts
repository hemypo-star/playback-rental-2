
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { getProductImageUrl, uploadProductImage } from '@/utils/imageUtils';

/**
 * Creates a new product
 * @param product Product data
 * @param imageFile Image file or URL
 * @returns Created product or null if creation failed
 */
export const createProduct = async (product: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Creating product:", product, "with image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    let imageFileName = product.imageUrl || '';
    
    // If we have an image (file or URL), upload or use it
    if (imageFile) {
      try {
        if (typeof imageFile === 'string') {
          console.log("Using external URL for product image:", imageFile);
          imageFileName = imageFile;
        } else {
          console.log("Uploading image file before creating product");
          imageFileName = await uploadProductImage(imageFile);
        }
        console.log("Image ready, filename/URL:", imageFileName);
      } catch (uploadError) {
        console.error("Error with product image:", uploadError);
        // Continue with product creation even if image handling fails
      }
    }
    
    // Prepare database product - use category_id if provided, otherwise convert category string to category_id
    let categoryValue = '';
    
    if (product.category_id !== undefined) {
      // Use the numeric category_id directly
      categoryValue = product.category_id.toString();
      console.log("Using provided category_id:", product.category_id);
    } else if (product.category) {
      // Legacy: if we get a category string, use it as is (for backward compatibility)
      categoryValue = product.category.toString();
      console.log("Using legacy category string:", product.category);
    } else {
      throw new Error("Product must have either category_id or category field");
    }
    
    const dbProduct = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      category: categoryValue, // Store as string in the database
      imageurl: imageFileName, // Use the uploaded image filename or URL
      quantity: product.quantity || 1,
      available: product.available !== undefined ? product.available : true
    };
    
    // Validate that all required fields have values
    if (!dbProduct.title || !dbProduct.category) {
      throw new Error("Product title and category are required fields");
    }
    
    console.log("Inserting product with category:", dbProduct.category, "and imageurl:", dbProduct.imageurl);
    
    // Insert the product
    const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
    
    if (error) {
      console.error("Error inserting product:", error);
      throw error;
    }
    
    if (!data) {
      console.error("No data returned from product insertion");
      return null;
    }
    
    console.log("Product created:", data);
    
    // Map imageurl to imageUrl and category to category_id for consistency in the frontend
    return {
      ...data,
      imageUrl: data.imageurl,
      category_id: parseInt(data.category) // Convert category string to category_id number
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};
