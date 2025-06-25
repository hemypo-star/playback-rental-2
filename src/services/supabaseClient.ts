
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { ensureStorageBucket } from './serverApi';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://84.201.170.203:8000";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYXliYWNrLXJlbnRhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0OTE0MTk2LCJleHAiOjIwNTA0OTAxOTZ9.SuPUKEDEZUzYTJaW9vcgr1zfDLg-uF0KqEKGJmnmAQ4";
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYXliYWNrLXJlbnRhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzQ5MTQxOTYsImV4cCI6MjA1MDQ5MDE5Nn0.F7vJOWoD0AjdCQTGfX8-h8oPhHiH7WQKjFbCZdBv9T0";

// For admin operations that require service role access, use this client
export const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Create a bucket if it doesn't exist already using server API
export const createBucketIfNotExists = async (name: string, isPublic: boolean = true) => {
  try {
    console.log(`Ensuring bucket ${name} exists via server API...`);
    
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
