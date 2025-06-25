
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "http://84.201.170.203:8000";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYXliYWNrLXJlbnRhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0OTE0MTk2LCJleHAiOjIwNTA0OTAxOTZ9.SuPUKEDEZUzYTJaW9vcgr1zfDLg-uF0KqEKGJmnmAQ4";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYXliYWNrLXJlbnRhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzQ5MTQxOTYsImV4cCI6MjA1MDQ5MDE5Nn0.F7vJOWoD0AjdCQTGfX8-h8oPhHiH7WQKjFbCZdBv9T0";

// For admin operations that require service role access, use this client
export const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

// Create a bucket if it doesn't exist already
export const createBucketIfNotExists = async (name: string, isPublic: boolean = true) => {
  try {
    console.log(`Ensuring bucket ${name} exists...`);
    
    // Call edge function to ensure bucket exists and is public
    const { data, error } = await supabase.functions.invoke('ensure-storage-bucket', {
      body: { bucketName: name }
    });

    if (error) {
      console.error(`Error ensuring bucket ${name} exists:`, error);
      return false;
    }
    
    console.log(`Bucket ${name} status:`, data);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${name} exists:`, error);
    return false;
  }
};

// Add a function to check if buckets exist
export const checkBucketsExist = async (): Promise<{ products: boolean; categories: boolean; }> => {
  try {
    // Use the authenticated user's session instead of service role
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
