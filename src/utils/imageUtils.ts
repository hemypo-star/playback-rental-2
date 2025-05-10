
import { supabase } from '@/integrations/supabase/client';
import { getPublicUrl, ensurePublicBucket } from '@/services/storageService';

export const getProductImageUrl = (imageUrl: string) => {
  return getPublicUrl('products', imageUrl);
};

export const uploadProductImage = async (file: File, productId?: string): Promise<string> => {
  try {
    // Ensure the products bucket exists and is public
    const bucketReady = await ensurePublicBucket('products');
    
    if (!bucketReady) {
      throw new Error('Could not ensure products bucket exists and is public');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload options with metadata to link to product
    const uploadOptions: { upsert: boolean; metadata?: { product_id: string } } = { 
      upsert: true 
    };
    
    // Add metadata if productId is provided
    if (productId) {
      uploadOptions.metadata = { 
        product_id: productId 
      };
    }

    const { error: uploadError, data } = await supabase.storage
      .from('products')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw uploadError;
    }

    return fileName;  // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

export const uploadCategoryImage = async (file: File, categoryId?: string): Promise<string> => {
  try {
    // Ensure the categories bucket exists and is public
    const bucketReady = await ensurePublicBucket('categories');
    
    if (!bucketReady) {
      throw new Error('Could not ensure categories bucket exists and is public');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload options with metadata to link to category
    const uploadOptions: { upsert: boolean; metadata?: { category_id: string } } = { 
      upsert: true 
    };
    
    // Add metadata if categoryId is provided
    if (categoryId) {
      uploadOptions.metadata = { 
        category_id: categoryId 
      };
    }

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    return fileName; // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
