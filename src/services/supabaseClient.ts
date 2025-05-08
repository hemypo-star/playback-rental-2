
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xwylatyyhqyfwsxfwzmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4";

// Create a Supabase client with the service role key for server-side operations
export const supabaseServiceClient = supabase;

// Create a bucket if it doesn't exist already
export const createBucketIfNotExists = async (name: string, isPublic: boolean = true) => {
  try {
    // Try to get the bucket first to see if it exists
    const { data: bucketExists, error: getBucketError } = await supabase.storage.getBucket(name);
    
    if (getBucketError && getBucketError.message !== 'Bucket not found') {
      console.error(`Error checking if bucket ${name} exists:`, getBucketError);
      throw getBucketError;
    }
    
    if (!bucketExists) {
      // Bucket doesn't exist, create it
      console.log(`Creating ${name} bucket`);
      const { error: createError } = await supabase.storage.createBucket(name, {
        public: isPublic,
      });
      
      if (createError) {
        console.error(`Error creating bucket ${name}:`, createError);
        
        // Handle RLS policy errors, could be due to permissions
        if (createError.message.includes('row-level security') || 
            createError.message.includes('permission denied')) {
          throw new Error(`Недостаточно прав для создания хранилища ${name}. Проверьте настройки авторизации.`);
        }
        
        throw createError;
      }
      
      // Set public bucket policy if needed
      if (isPublic) {
        const { error: policyError } = await supabase.storage.updateBucket(name, { public: true });
        if (policyError) {
          console.error(`Error setting bucket ${name} to public:`, policyError);
        }
      }
      
      console.log(`Created ${name} bucket successfully`);
    } else {
      console.log(`${name} bucket already exists`);
      
      // Make sure existing bucket has correct public setting
      if (isPublic) {
        await supabase.storage.updateBucket(name, { public: true });
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error with bucket ${name}:`, error);
    throw error;
  }
};

// Helper function to check if buckets exist
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
