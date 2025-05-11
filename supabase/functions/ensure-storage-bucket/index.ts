
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
    
    // Add public policy for downloading if needed
    await ensurePublicPolicy(supabaseAdmin, bucketName);
    
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
  } catch (error) {
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

// Helper function to ensure public policy for the bucket
async function ensurePublicPolicy(supabase: any, bucketName: string) {
  try {
    // First get existing policies
    const { data: policies, error: getPoliciesError } = await supabase.storage.from(bucketName).getPolicies();
    
    if (getPoliciesError) {
      console.error(`Error getting policies for ${bucketName}:`, getPoliciesError);
      return;
    }
    
    // Define the public policy
    const publicPolicy = {
      name: `${bucketName}_public_select`,
      definition: {
        statements: [
          {
            operation: 'SELECT',
            actions: ['object_info', 'object_get'],
            role: 'anon',
          },
        ],
      }
    };
    
    // Check if a similar public policy already exists
    const hasPublicPolicy = policies.some((p: any) => {
      return p.name === `${bucketName}_public_select` || 
             (p.statements && p.statements.some((s: any) => 
               s.actions.includes('object_get') && s.role === 'anon'));
    });
    
    if (!hasPublicPolicy) {
      console.log(`Creating public policy for ${bucketName}...`);
      
      // Create the policy
      await supabase.rpc('create_storage_policy', {
        bucket_name: bucketName,
        policy_name: publicPolicy.name,
        definition: publicPolicy.definition
      });
      
      console.log(`Public policy created for ${bucketName}.`);
    } else {
      console.log(`Public policy already exists for ${bucketName}.`);
    }
  } catch (error) {
    console.error(`Error ensuring public policy for ${bucketName}:`, error);
  }
}
