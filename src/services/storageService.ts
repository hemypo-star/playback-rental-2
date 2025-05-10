
import { supabase } from '@/integrations/supabase/client';

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
  
  // Get public URL from storage
  const { data } = supabase.storage
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
    
    const { data, error } = await supabase
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
    const { error } = await supabase
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
