
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
                  USING (bucket_id = ''${bucketName}'' AND owner IS NOT NULL);';
        END IF;
      END
      $$;
      
      COMMIT;
    `;
    
    // Execute the policy SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error executing policy SQL: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Error creating policy: ${error.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Check policies to verify
    const { data, error: checkError } = await supabaseAdmin.from('storage.policies')
      .select('name, definition')
      .eq('bucket_name', bucketName);
    
    if (checkError) {
      console.error(`Warning: Could not verify policies: ${checkError.message}`);
    } else {
      console.log(`Policies for ${bucketName}:`, data);
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
  } catch (error) {
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
