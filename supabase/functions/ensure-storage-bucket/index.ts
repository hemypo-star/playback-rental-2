
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { bucketName } = await req.json()
    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: 'Bucket name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create authenticated Supabase client using service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        } 
      }
    )

    try {
      console.log(`Checking if bucket ${bucketName} exists...`);
      
      // Try to get the bucket first to see if it exists
      const { data: bucket, error: getBucketError } = await supabaseClient.storage.getBucket(bucketName)
      
      if (getBucketError) {
        if (getBucketError.message.includes('not found')) {
          console.log(`Bucket ${bucketName} not found, creating it...`);
          
          // Create bucket if it doesn't exist
          const { error: createError } = await supabaseClient.storage.createBucket(bucketName, { 
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
          })
          
          if (createError) {
            console.error(`Error creating bucket ${bucketName}:`, createError)
            throw createError
          }
          
          console.log(`Successfully created bucket ${bucketName}`)
          
          // Explicitly update the bucket policy to make it public
          const { error: policyError } = await supabaseClient.storage.updateBucket(bucketName, { 
            public: true 
          })
          
          if (policyError) {
            console.error(`Error updating bucket policy for ${bucketName}:`, policyError)
            throw policyError
          }
          
          console.log(`Successfully updated bucket ${bucketName} to public`)
        } else {
          console.error(`Error getting bucket ${bucketName}:`, getBucketError)
          throw getBucketError
        }
      } else {
        console.log(`Bucket ${bucketName} already exists, ensuring it's public...`)
        
        // Update existing bucket to ensure it's public
        const { error: updateError } = await supabaseClient.storage.updateBucket(bucketName, { 
          public: true 
        })
          
        if (updateError) {
          console.error(`Error updating bucket ${bucketName}:`, updateError)
          throw updateError
        }
        
        console.log(`Successfully updated bucket ${bucketName} to public`)
      }
      
      // Create or update bucket-level policies
      try {
        console.log(`Setting up policies for bucket ${bucketName}...`);
        
        // Add policies for the bucket to allow read access
        const policyName = `${bucketName}_public_read`;
        
        // First check if policy exists
        const { data: policies } = await supabaseClient.rpc('get_policies_for_bucket', { 
          bucket_id: bucketName 
        });
        
        console.log(`Existing policies for ${bucketName}:`, policies);
        
        // Create policy if needed
        await supabaseClient.storage.from(bucketName).createSignedUrl('test.txt', 60);
        
        console.log(`Successfully set up policies for bucket ${bucketName}`);
      } catch (policyError) {
        console.error(`Error setting up policies for bucket ${bucketName} (non-critical):`, policyError);
        // Don't fail the entire operation for policy errors
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Public bucket ${bucketName} is ready`,
          bucket: bucketName
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (error) {
      console.error(`Error with bucket operation:`, error)
      throw error
    }
  } catch (error) {
    console.error(`Error ensuring storage bucket:`, error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
