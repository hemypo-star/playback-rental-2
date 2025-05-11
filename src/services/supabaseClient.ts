
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xwylatyyhqyfwsxfwzmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjcwMDMyMCwiZXhwIjoyMDU4Mjc2MzIwfQ.aq-6Z3p3W2jqAt-4Rwx-f_M_fxLpsZGRULKNpOnePm8"; // Using the service role key for admin operations

// Create a Supabase client with the service role key for admin operations
export const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false, // Don't persist admin sessions
    autoRefreshToken: true
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
    const { data: buckets, error } = await supabaseServiceClient.storage.listBuckets();
    
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
