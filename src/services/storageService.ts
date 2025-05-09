
import { supabase } from '@/integrations/supabase/client';

// Call the edge function to ensure a bucket exists and is public
// This uses the SERVICE_ROLE_KEY which has admin privileges
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Check if bucket exists first
    const { data: bucketExists, error: checkError } = await supabase
      .storage
      .getBucket(bucketName);

    // If bucket doesn't exist, create it
    if (!bucketExists && checkError) {
      const { data, error } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });

      if (error) {
        console.error(`Error creating ${bucketName} bucket:`, error);
        return false;
      }
      
      console.log(`Created ${bucketName} storage bucket`);
    }

    return true;
  } catch (error) {
    console.error(`Error ensuring public bucket ${bucketName}:`, error);
    return false;
  }
};

// Helper to reset storage permissions using edge function
export const resetStoragePermissions = async (): Promise<boolean> => {
  try {
    const productsResult = await ensurePublicBucket('products');
    const categoriesResult = await ensurePublicBucket('categories');
    
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
    
  return data.publicUrl;
};
