
// Re-export optimized functions for backward compatibility
export { 
  getOptimizedImageUrl as getProductImageUrl,
  uploadProductImage,
  prefetchImage,
  prefetchImages,
  clearImageCache
} from './optimizedImageUtils';

import { supabase } from '@/integrations/supabase/client';
import { ensurePublicBucket } from '@/services/storageService';

/**
 * Upload category image with optimization
 */
export const uploadCategoryImage = async (imageFile: File | string, categoryId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    return imageFile;
  }
  
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
    
    return filePath;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};

/**
 * Verify storage access
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
