
import { supabase } from '@/integrations/supabase/client';

// Get a public URL for a file in a bucket
export const getPublicUrl = (bucketName: string, fileName: string): string | null => {
  if (!fileName) return null;
  
  try {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error getting public URL for ${fileName} in ${bucketName}:`, error);
    return null;
  }
};

// List all files in a bucket
export const listBucketFiles = async (bucketName: string): Promise<any[]> => {
  try {
    console.log(`Listing files in ${bucketName} bucket...`);
    const { data, error } = await supabase.storage.from(bucketName).list('', {
      sortBy: { column: 'name', order: 'asc' }
    });
    
    if (error) {
      console.error(`Error listing files in ${bucketName}:`, error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} files in ${bucketName} bucket`);
    return data || [];
  } catch (error) {
    console.error(`Error in listBucketFiles for ${bucketName}:`, error);
    return [];
  }
};

// Test storage connection
export const testStorageConnection = async (bucketName: string): Promise<{success: boolean; message: string}> => {
  try {
    console.log(`Testing connection to ${bucketName} bucket...`);
    
    // Try to list files in the bucket to test access
    const { data, error } = await supabase.storage.from(bucketName).list('');
    
    if (error) {
      console.error(`Error connecting to ${bucketName} bucket:`, error);
      return {
        success: false,
        message: `Error connecting to ${bucketName} bucket: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: `Successfully connected to ${bucketName} bucket. ${data.length} files found.`
    };
  } catch (error: any) {
    console.error(`Exception testing storage connection:`, error);
    return {
      success: false,
      message: `Exception testing storage connection: ${error?.message || 'Unknown error'}`
    };
  }
};

// Check if storage buckets exist and are accessible
export const checkStorageStatus = async (): Promise<{ 
  products: boolean; 
  categories: boolean;
  message: string;
}> => {
  try {
    console.log('Checking storage bucket status...');
    
    const productsTest = await testStorageConnection('products');
    const categoriesTest = await testStorageConnection('categories');
    
    return {
      products: productsTest.success,
      categories: categoriesTest.success,
      message: `Products: ${productsTest.success ? 'OK' : 'Failed'}, Categories: ${categoriesTest.success ? 'OK' : 'Failed'}`
    };
  } catch (error: any) {
    console.error('Error checking storage status:', error);
    return {
      products: false,
      categories: false,
      message: `Error checking storage: ${error?.message || 'Unknown error'}`
    };
  }
};

// Reset storage permissions (legacy function for compatibility)
export const resetStoragePermissions = async (): Promise<boolean> => {
  const status = await checkStorageStatus();
  return status.products && status.categories;
};

// Ensure bucket exists (legacy function for compatibility)
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  const test = await testStorageConnection(bucketName);
  return test.success;
};
