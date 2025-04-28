
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

export const supabaseServiceClient = createClient<Database>(supabaseUrl, supabaseKey);

export const checkAuth = () => {
  return localStorage.getItem('auth_token') ? true : false;
};

// Utility to properly create a bucket with public access
export const createBucketIfNotExists = async (bucketName: string) => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabaseServiceClient.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`${bucketName} bucket not found, creating it`);
      
      // Create the bucket
      const { data, error } = await supabaseServiceClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 50000000, // 50MB file size limit
        allowedMimeTypes: ['image/*'] // Allow only image uploads
      });
      
      if (error) {
        console.error(`Error creating bucket ${bucketName}:`, error);
        throw error;
      }
      
      console.log(`Created ${bucketName} bucket with public access`);
    } else {
      console.log(`${bucketName} bucket already exists`);
    }
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    throw error;
  }
};
