
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.22.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the bucket name from the request
    const { bucketName } = await req.json();
    
    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: 'Bucket name is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log(`Ensuring bucket ${bucketName} exists and is public...`);
    
    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if the bucket exists
    let { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return new Response(
        JSON.stringify({ error: `Error listing buckets: ${listError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Find the bucket
    let bucket = buckets?.find(b => b.name === bucketName);
    
    // Create the bucket if it doesn't exist
    if (!bucket) {
      console.log(`Bucket ${bucketName} doesn't exist. Creating...`);
      
      const { data, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
        fileSizeLimit: 5242880 // 5MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        return new Response(
          JSON.stringify({ error: `Error creating bucket: ${createError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      console.log(`Bucket ${bucketName} created.`);
    } else {
      console.log(`Bucket ${bucketName} already exists.`);
    }
    
    // Update bucket to be public
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
      public: true
    });
    
    if (updateError) {
      console.error(`Error making bucket ${bucketName} public:`, updateError);
      return new Response(
        JSON.stringify({ error: `Error making bucket public: ${updateError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    console.log(`Bucket ${bucketName} is now public.`);
    
    // Create public access policy using RPC function
    try {
      const { error: policyError } = await supabaseAdmin.rpc('create_public_bucket_policy', { 
        bucket_name: bucketName 
      });
      
      if (policyError) {
        console.log(`Warning: Could not create policy via RPC: ${policyError.message}`);
      } else {
        console.log(`Public access policy created or verified for ${bucketName}`);
      }
    } catch (policyError: any) {
      console.log(`Error with policy creation: ${policyError.message}`);
      // Continue despite this error, bucket should still be public
    }
    
    // Create direct insert policy for authenticated users
    try {
      // Execute SQL to add insert policy for authenticated users
      const insertPolicySql = `
        BEGIN;
        
        -- Create policy for authenticated users to upload if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE tablename = 'objects'
              AND schemaname = 'storage'
              AND policyname = '${bucketName}_auth_insert'
          ) THEN
            EXECUTE 'CREATE POLICY "${bucketName}_auth_insert" ON storage.objects
                    FOR INSERT
                    TO authenticated
                    WITH CHECK (bucket_id = ''${bucketName}'');';
          END IF;
        END
        $$;
        
        COMMIT;
      `;
      
      const { error: insertPolicyError } = await supabaseAdmin.rpc('exec_sql', { sql: insertPolicySql });
      
      if (insertPolicyError) {
        console.log(`Warning: Could not create insert policy: ${insertPolicyError.message}`);
      } else {
        console.log(`Insert policy created or verified for ${bucketName}`);
      }
    } catch (insertError: any) {
      console.log(`Error with insert policy creation: ${insertError.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bucket ${bucketName} exists and is public.`,
        bucketName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
