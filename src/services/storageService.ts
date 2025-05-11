
import { supabase } from '@/integrations/supabase/client';
import { createBucketIfNotExists } from '@/services/supabaseClient';

// Ensure a storage bucket exists and is public
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Use the edge function to ensure bucket exists and is public
    const result = await createBucketIfNotExists(bucketName, true);
    return result;
  } catch (error) {
    console.error(`Error ensuring public bucket ${bucketName}:`, error);
    return false;
  }
};

// Reset storage permissions for all buckets
export const resetStoragePermissions = async (): Promise<boolean> => {
  try {
    // Ensure both products and categories buckets
    const productsResult = await ensurePublicBucket('products');
    const categoriesResult = await ensurePublicBucket('categories');
    
    return productsResult && categoriesResult;
  } catch (error) {
    console.error('Error resetting storage permissions:', error);
    return false;
  }
};

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
    const { data, error } = await supabase.storage.from(bucketName).list();
    
    if (error) {
      console.error(`Error listing files in ${bucketName}:`, error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in listBucketFiles for ${bucketName}:`, error);
    return [];
  }
};

// Test storage connection
export const testStorageConnection = async (bucketName: string): Promise<{success: boolean; message: string}> => {
  try {
    // Try to list files in the bucket to test access
    const { data, error } = await supabase.storage.from(bucketName).list('');
    
    if (error) {
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
    return {
      success: false,
      message: `Exception testing storage connection: ${error?.message || 'Unknown error'}`
    };
  }
};
