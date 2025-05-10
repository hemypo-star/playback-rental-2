
import { supabase } from '@/integrations/supabase/client';
import { getPublicUrl, ensurePublicBucket } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';

export const getProductImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  return getPublicUrl('products', imageUrl);
};

export const getCategoryImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  return getPublicUrl('categories', imageUrl);
};

export const uploadProductImage = async (file: File, productId?: string): Promise<string> => {
  try {
    console.log(`Uploading product image for product ID: ${productId || 'new product'}`);
    
    // Ensure the products bucket exists and is public
    const bucketReady = await ensurePublicBucket('products');
    
    if (!bucketReady) {
      console.error("Products bucket not ready, cannot upload image");
      throw new Error('Could not ensure products bucket exists and is public');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

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

    console.log(`Uploading file ${fileName} to products bucket...`);
    
    // Use .upload() with explicit bucket name 'products'
    const { error: uploadError, data } = await supabase.storage
      .from('products')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw uploadError;
    }

    console.log(`Successfully uploaded ${fileName} to products bucket`);
    return fileName;  // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

export const uploadCategoryImage = async (file: File, categoryId?: string): Promise<string> => {
  try {
    console.log(`Uploading category image for category ID: ${categoryId || 'new category'}`);
    
    // Ensure the categories bucket exists and is public
    const bucketReady = await ensurePublicBucket('categories');
    
    if (!bucketReady) {
      console.error("Categories bucket not ready, cannot upload image");
      throw new Error('Could not ensure categories bucket exists and is public');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

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

    console.log(`Uploading file ${fileName} to categories bucket...`);
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    console.log(`Successfully uploaded ${fileName} to categories bucket`);
    return fileName; // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
