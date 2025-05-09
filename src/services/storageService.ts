
import { supabase } from '@/integrations/supabase/client';

// Call the edge function to ensure a bucket exists and is public
// This uses the SERVICE_ROLE_KEY which has admin privileges
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-public-bucket-policy', {
      body: { bucketName }
    });

    if (error) {
      console.error(`Error ensuring public bucket ${bucketName}:`, error);
      throw error;
    }

    console.log(`Storage bucket operation result:`, data);
    return true;
  } catch (error) {
    console.error(`Failed to ensure public bucket ${bucketName}:`, error);
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
