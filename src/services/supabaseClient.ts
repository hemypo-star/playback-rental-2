
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
