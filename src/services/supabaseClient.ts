import { supabase } from '@/integrations/supabase/client';
import { ensureStorageBucket } from './serverApi';

//
// DANGER: The supabaseServiceClient that used the service key has been
// completely removed. NEVER expose your service key to the frontend.
//

// Create a bucket if it doesn't exist already using your secure server API
export const createBucketIfNotExists = async (name: string, isPublic: boolean = true) => {
  try {
    console.log(`Ensuring bucket ${name} exists via server API...`);

    // This correctly calls your backend, which can safely use the service key.
    const result = await ensureStorageBucket(name);

    if (!result.success) {
      console.error(`Error ensuring bucket ${name} exists:`, result.message);
      return false;
    }

    console.log(`Bucket ${name} status:`, result.message);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${name} exists:`, error);
    return false;
  }
};

// This function is safe because it uses the standard 'supabase' client,
// which relies on the user's permissions (Row Level Security).
export const checkBucketsExist = async (): Promise<{ products: boolean; categories: boolean; }> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Error listing buckets:", error);
      throw error;
    }

    const bucketNames = buckets.map(b => b.name);

    return {
      products: bucketNames.includes('products'),
      categories: bucketNames.includes('categories')
    };
  } catch (error) {
    console.error("Error checking buckets:", error);
    throw error;
  }
};