
// Follow this setup guide to integrate the Deno runtime and the Supabase JS library with your project:
// https://docs.supabase.com/reference/javascript/initializing
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the service role key
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }
    
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        }
      }
    );
    
    // Parse request body
    const { bucketName, createIfNotExists = true } = await req.json();
    
    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: "Bucket name is required" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    console.log(`Ensuring bucket ${bucketName} exists and is public...`);
    
    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      throw listError;
    }
    
    const bucketExists = existingBuckets.some(bucket => bucket.name === bucketName);
    
    // Create bucket if it doesn't exist and createIfNotExists is true
    if (!bucketExists) {
      if (!createIfNotExists) {
        return new Response(
          JSON.stringify({ 
            error: "Bucket doesn't exist", 
            message: `Bucket ${bucketName} doesn't exist and createIfNotExists is false` 
          }),
          { 
            status: 404, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            } 
          }
        );
      }
      
      console.log(`Bucket ${bucketName} doesn't exist, creating...`);
      
      const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        throw createError;
      }
      
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists.`);
    }
    
    // Ensure the bucket is public
    try {
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (updateError) {
        console.error(`Error updating bucket ${bucketName}:`, updateError);
        throw updateError;
      }
      
      console.log(`Bucket ${bucketName} is now public.`);
    } catch (updateError) {
      console.error(`Error updating bucket ${bucketName}:`, updateError);
      // Continue even if update fails, we'll try to create the policy directly
    }
    
    // Try to create a policy for public access as a fallback
    try {
      const { data: policyData, error: policyError } = await supabase.rpc(
        'create_public_bucket_policy', 
        { bucket_name: bucketName }
      );
      
      if (policyError) {
        console.warn(`Warning: Could not create policy via RPC:`, policyError);
      }
    } catch (policyError) {
      console.warn(`Warning: Could not create policy via RPC:`, policyError);
    }
    
    // Create insert policy for authenticated users
    try {
      const insertPolicySql = `
        CREATE POLICY IF NOT EXISTS "authenticated users can upload to ${bucketName}" 
        ON storage.objects 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = '${bucketName}')
      `;
      
      const { data: insertPolicyData, error: insertPolicyError } = await supabase.rpc(
        'exec_sql', 
        { sql: insertPolicySql }
      );
      
      if (insertPolicyError) {
        console.warn(`Warning: Could not create insert policy:`, insertPolicyError);
      }
    } catch (insertPolicyError) {
      console.warn(`Warning: Could not create insert policy:`, insertPolicyError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bucket ${bucketName} exists and is public` 
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error("Error in ensure-storage-bucket function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  }
});
