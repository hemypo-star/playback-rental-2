
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';
import { getPublicUrl, ensurePublicBucket } from '@/services/storageService';

// Get public URL for a product image
export const getProductImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  
  // If the imageUrl is already a full URL, return it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Otherwise, get the public URL from Supabase storage
  return getPublicUrl('products', imageUrl);
};

// Get public URL for a category image
export const getCategoryImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  
  // If the imageUrl is already a full URL, return it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Otherwise, get the public URL from Supabase storage
  return getPublicUrl('categories', imageUrl);
};

export const uploadProductImage = async (file: File | string, productId?: string): Promise<string> => {
  try {
    // If file is a string (URL), return it directly
    if (typeof file === 'string') {
      console.log(`Using external URL for product image: ${file}`);
      return file;
    }
    
    console.log(`Uploading product image for product ID: ${productId || 'new product'}`);

    // Ensure the products bucket exists and is public
    const bucketReady = await ensurePublicBucket('products');
    if (!bucketReady) {
      console.error("Products bucket not ready, attempting to create it again...");
      // Try one more time with a direct method
      await supabase.functions.invoke('ensure-storage-bucket', {
        body: { bucketName: 'products' }
      });
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
    
    // Use authenticated user for uploads
    const { data, error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw uploadError;
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no file path was returned');
    }

    console.log(`Successfully uploaded ${fileName} to products bucket`, data);
    return fileName;  // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

// The uploadCategoryImage function explicitly requires File parameter
export const uploadCategoryImage = async (file: File, categoryId?: string): Promise<string> => {
  try {
    console.log(`Uploading category image for category ID: ${categoryId || 'new category'}`);
    
    // Ensure the categories bucket exists and is public
    const bucketReady = await ensurePublicBucket('categories');
    
    if (!bucketReady) {
      console.error("Categories bucket not ready, attempting to create it again...");
      // Try one more time with a direct method
      await supabase.functions.invoke('ensure-storage-bucket', {
        body: { bucketName: 'categories' }
      });
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
    
    // Use authenticated user for uploads
    const { data, error: uploadError } = await supabase.storage
      .from('categories')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no file path was returned');
    }

    console.log(`Successfully uploaded ${fileName} to categories bucket`, data);
    return fileName; // Return just the filename, not the full URL
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};

// Add a function to verify storage access and permissions
export const verifyStorageAccess = async (): Promise<{ products: boolean, categories: boolean }> => {
  try {
    console.log("Verifying storage access...");
    
    // First try to ensure buckets exist
    const productsResult = await ensurePublicBucket('products');
    const categoriesResult = await ensurePublicBucket('categories');
    
    // Then test actual access
    const productsTest = await testBucketAccess('products');
    const categoriesTest = await testBucketAccess('categories');
    
    console.log("Storage access verification results:", { 
      products: productsTest, 
      categories: categoriesTest 
    });
    
    return { 
      products: productsTest, 
      categories: categoriesTest 
    };
  } catch (error) {
    console.error("Error verifying storage access:", error);
    return { 
      products: false, 
      categories: false 
    };
  }
};

// Helper function to test if a bucket is accessible
async function testBucketAccess(bucketName: string): Promise<boolean> {
  try {
    // Try to list files in the bucket
    const { data, error } = await supabase.storage.from(bucketName).list();
    
    if (error) {
      console.error(`Error accessing ${bucketName} bucket:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error testing ${bucketName} bucket access:`, error);
    return false;
  }
}
