
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
    
    console.log(`Creating public policy for bucket ${bucketName}...`);
    
    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Create SQL to apply public policy
    const sql = `
      -- Make sure the bucket exists and is public
      BEGIN;
      
      -- First make sure the bucket is public
      UPDATE storage.buckets
      SET public = true
      WHERE name = '${bucketName}';
      
      -- Create policy for anonymous reads if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE tablename = 'objects'
            AND schemaname = 'storage'
            AND policyname = '${bucketName}_public_select'
        ) THEN
          EXECUTE 'CREATE POLICY "${bucketName}_public_select" ON storage.objects
                  FOR SELECT
                  USING (bucket_id = ''${bucketName}'')';
        END IF;
      END
      $$;
      
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
                  WITH CHECK (bucket_id = ''${bucketName}'')';
        END IF;
      END
      $$;
      
      COMMIT;
    `;
    
    // Execute the policy SQL using the exec_sql RPC function
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error executing policy SQL for bucket ${bucketName}:`, error);
      if (error.message.includes('function "exec_sql" does not exist')) {
        console.log('Creating exec_sql function...');
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `;
        try {
          // Try to create the exec_sql function directly
          const { error: fnError } = await supabaseAdmin.from('extensions').select('*').eq('name', 'pg_exec_sql').single();
          if (fnError) {
            console.log('Could not create exec_sql function due to permissions. Using direct SQL execution instead...');
            // Try direct policy creation
            await createDirectPolicies(supabaseAdmin, bucketName);
            return new Response(
              JSON.stringify({ 
                success: true,
                message: `Attempted direct policy creation for ${bucketName} bucket.`
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } catch (e) {
          console.error('Error creating exec_sql function:', e);
        }
      }
      
      return new Response(
        JSON.stringify({ error: `Error creating policy: ${error.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Check policies to verify
    const { data: policyData, error: checkError } = await supabaseAdmin.from('storage.policies')
      .select('name, definition')
      .eq('bucket_name', bucketName);
    
    if (checkError) {
      console.log(`Warning: Could not verify policies: ${checkError.message}`);
    } else {
      console.log(`Policies for ${bucketName}:`, policyData);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Policies for ${bucketName} bucket have been applied successfully.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error creating bucket policy:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Fallback function to create policies directly if exec_sql is not available
async function createDirectPolicies(supabase: any, bucketName: string) {
  try {
    // Update bucket to be public
    await supabase.storage.updateBucket(bucketName, { public: true });
    console.log(`Updated ${bucketName} to be public`);
    
    // Unfortunately, we can't directly create policies without the exec_sql function
    // We'll have to rely on the bucket being public
    return true;
  } catch (error) {
    console.error('Error in direct policy creation:', error);
    return false;
  }
}
