
import { supabase } from '@/integrations/supabase/client';

// Create a bucket if it doesn't exist already
export const createBucketIfNotExists = async (name: string, isPublic: boolean = true) => {
  try {
    // Try to get the bucket first to see if it exists
    const { data, error } = await supabase.storage.getBucket(name);
    
    if (error) {
      // Bucket doesn't exist, create it
      console.log(`Creating ${name} bucket`);
      const { error: createError } = await supabase.storage.createBucket(name, {
        public: isPublic,
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log(`Created ${name} bucket successfully`);
    } else {
      console.log(`${name} bucket already exists`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error creating bucket ${name}:`, error);
    throw error;
  }
};
