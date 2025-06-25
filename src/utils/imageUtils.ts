
import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a product image to Supabase storage
 * @param imageFile The image file to upload
 * @param productId Optional product ID for updates
 * @returns The URL of the uploaded image
 */
export const uploadProductImage = async (imageFile: File | string, productId?: string): Promise<string> => {
  // If imageFile is already a URL (string), just return it
  if (typeof imageFile === 'string') {
    // Check if it's a full URL or just a path
    if (imageFile.startsWith('http')) {
      console.log('Already an absolute URL, skipping upload:', imageFile);
      return imageFile;
    }
    return imageFile;
  }
  
  const timestamp = new Date().getTime();
  const fileName = `${productId ? `${productId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
    console.log('Uploading product image to bucket "products":', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw new Error(`Error uploading product image: ${uploadError.message}`);
    }
    
    console.log('Product image uploaded successfully:', filePath);
    // Return the path of the uploaded image
    return filePath;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

/**
 * Gets the URL of a product image
 * @param imageUrl The image URL or path
 * @returns The full URL of the image
 */
export const getProductImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  
  console.log("getProductImageUrl processing:", imageUrl);
  
  if (imageUrl.startsWith('http')) {
    console.log("Using direct URL (external):", imageUrl);
    return imageUrl;
  }
  
  const fullUrl = `http://84.201.170.203:8000/storage/v1/object/public/products/${imageUrl}`;
  console.log("Generated Supabase URL:", fullUrl);
  return fullUrl;
};

/**
 * Uploads a category image to Supabase storage
 * @param imageFile The image file to upload
 * @param categoryId Optional category ID for updates
 * @returns The URL of the uploaded image
 */
export const uploadCategoryImage = async (imageFile: File | string, categoryId?: string): Promise<string> => {
  // If imageFile is already a URL (string), just return it
  if (typeof imageFile === 'string') {
    return imageFile;
  }
  
  const timestamp = new Date().getTime();
  const fileName = `${categoryId ? `${categoryId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
    console.log('Uploading category image to bucket "categories":', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw new Error(`Error uploading category image: ${uploadError.message}`);
    }
    
    console.log('Category image uploaded successfully:', filePath);
    // Return the path of the uploaded image
    return filePath;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};

/**
 * Gets the URL of a category image
 * @param imageUrl The image URL or path
 * @returns The full URL of the image
 */
export const getCategoryImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  return `http://84.201.170.203:8000/storage/v1/object/public/categories/${imageUrl}`;
};

/**
 * Verifies storage access by attempting to list files
 * @returns Boolean indicating if storage is accessible
 */
export const verifyStorageAccess = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.getBucket('products');
    if (error) {
      console.error('Error accessing storage:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in verifyStorageAccess:', error);
    return false;
  }
};
