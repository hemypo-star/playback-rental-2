
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';

// Call the edge function to ensure a bucket exists and is public
// This uses the SERVICE_ROLE_KEY which has admin privileges
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Ensuring public bucket ${bucketName} exists...`);
    
    // Call edge function to ensure bucket exists and is public
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

// Helper to reset storage permissions using edge function
export const resetStoragePermissions = async (): Promise<boolean> => {
  try {
    console.log("Resetting storage permissions for all buckets...");
    
    // First, ensure the products bucket exists
    const productsResult = await ensurePublicBucket('products');
    
    if (!productsResult) {
      console.error("Failed to ensure products bucket exists");
      return false;
    }
    
    // Then, ensure the categories bucket exists
    const categoriesResult = await ensurePublicBucket('categories');
    
    if (!categoriesResult) {
      console.error("Failed to ensure categories bucket exists");
      return false;
    }
    
    console.log("Storage reset results:", { products: productsResult, categories: categoriesResult });
    return productsResult && categoriesResult;
  } catch (error) {
    console.error('Error resetting storage permissions:', error);
    return false;
  }
};

// Get the public URL for a file in a bucket
export const getPublicUrl = (bucketName: string, filePath: string): string | null => {
  if (!filePath) return null;
  
  // If it's already a full URL, return it
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Get public URL from storage - use supabaseServiceClient for consistency
  const { data } = supabaseServiceClient.storage
    .from(bucketName)
    .getPublicUrl(filePath);
  
  console.log(`Generated public URL for ${bucketName}/${filePath}:`, data.publicUrl);
  return data.publicUrl;
};

// List all files in a bucket
export const listBucketFiles = async (bucketName: string) => {
  try {
    // Ensure bucket exists before trying to list files
    await ensurePublicBucket(bucketName);
    
    const { data, error } = await supabaseServiceClient
      .storage
      .from(bucketName)
      .list();
    
    if (error) {
      console.error(`Error listing files in ${bucketName}:`, error);
      return [];
    }
    
    console.log(`Listed ${data?.length || 0} files in ${bucketName} bucket`);
    return data || [];
  } catch (error) {
    console.error(`Error in listBucketFiles for ${bucketName}:`, error);
    return [];
  }
};

// Delete a file from a bucket
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient
      .storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error(`Error deleting file ${filePath} from ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Successfully deleted file ${filePath} from ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`Error in deleteFile for ${bucketName}/${filePath}:`, error);
    return false;
  }
};

// Test storage connection and policies
export const testStorageConnection = async (bucketName: string): Promise<{
  success: boolean;
  canRead: boolean;
  canWrite: boolean;
  message: string;
}> => {
  try {
    console.log(`Testing storage connection for ${bucketName} bucket...`);
    
    // Ensure the bucket exists
    const bucketExists = await ensurePublicBucket(bucketName);
    if (!bucketExists) {
      return {
        success: false,
        canRead: false,
        canWrite: false,
        message: `Failed to ensure ${bucketName} bucket exists`
      };
    }
    
    // Test reading from the bucket
    let canRead = false;
    try {
      const { data, error } = await supabaseServiceClient.storage.from(bucketName).list();
      if (!error) {
        canRead = true;
        console.log(`Successfully read from ${bucketName} bucket, found ${data?.length || 0} files`);
      } else {
        console.error(`Error reading from ${bucketName} bucket:`, error);
      }
    } catch (readError) {
      console.error(`Exception reading from ${bucketName} bucket:`, readError);
    }
    
    // Test writing to the bucket with a tiny test file
    let canWrite = false;
    const testFileName = `test_${Date.now()}.txt`;
    const testFileContent = new Blob(['test'], { type: 'text/plain' });
    
    try {
      const { error: uploadError } = await supabaseServiceClient.storage
        .from(bucketName)
        .upload(testFileName, testFileContent, { upsert: true });
      
      if (!uploadError) {
        canWrite = true;
        console.log(`Successfully wrote test file to ${bucketName} bucket`);
        
        // Clean up the test file
        await supabaseServiceClient.storage.from(bucketName).remove([testFileName]);
        console.log(`Cleaned up test file from ${bucketName} bucket`);
      } else {
        console.error(`Error writing to ${bucketName} bucket:`, uploadError);
      }
    } catch (writeError) {
      console.error(`Exception writing to ${bucketName} bucket:`, writeError);
    }
    
    return {
      success: canRead && canWrite,
      canRead,
      canWrite,
      message: canRead && canWrite 
        ? `Successfully tested ${bucketName} bucket` 
        : `Issues with ${bucketName} bucket: ${!canRead ? 'cannot read, ' : ''}${!canWrite ? 'cannot write' : ''}`
    };
  } catch (error) {
    console.error(`Error testing ${bucketName} bucket:`, error);
    return {
      success: false,
      canRead: false,
      canWrite: false,
      message: `Error testing ${bucketName} bucket: ${error}`
    };
  }
};
