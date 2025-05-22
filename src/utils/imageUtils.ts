
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';
import { getPublicUrl, ensurePublicBucket } from '@/services/storageService';

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
  
  // Ensure the products bucket exists
  await ensurePublicBucket('products');
  
  const timestamp = new Date().getTime();
  const fileName = `${productId ? `${productId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
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
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  return `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${imageUrl}`;
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
  
  // Ensure the categories bucket exists
  await ensurePublicBucket('categories');
  
  const timestamp = new Date().getTime();
  const fileName = `${categoryId ? `${categoryId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
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
    
    // Return the path of the uploaded image
    return filePath;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
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
