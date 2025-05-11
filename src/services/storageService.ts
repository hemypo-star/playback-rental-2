
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';
import { createBucketIfNotExists } from '@/services/supabaseClient';

// Ensure a storage bucket exists and is public
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Ensuring public bucket ${bucketName} exists...`);
    
    // Use the edge function to ensure bucket exists and is public
    const { data, error } = await supabase.functions.invoke('ensure-storage-bucket', {
      body: { bucketName }
    });

    if (error) {
      console.error(`Error ensuring public bucket ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Bucket ${bucketName} status:`, data);
    return true;
  } catch (error) {
    console.error(`Error ensuring public bucket ${bucketName}:`, error);
    return false;
  }
};

// Reset storage permissions for all buckets
export const resetStoragePermissions = async (): Promise<boolean> => {
  try {
    console.log('Resetting storage permissions for all buckets...');
    
    // Ensure both products and categories buckets
    const productsResult = await ensurePublicBucket('products');
    const categoriesResult = await ensurePublicBucket('categories');
    
    console.log(`Reset results: products=${productsResult}, categories=${categoriesResult}`);
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
    
    // First ensure the bucket exists
    const bucketExists = await ensurePublicBucket(bucketName);
    if (!bucketExists) {
      return {
        success: false,
        message: `Failed to ensure ${bucketName} bucket exists`
      };
    }
    
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
