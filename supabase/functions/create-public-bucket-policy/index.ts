
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

    // Create authenticated Supabase client with service role key for admin privileges
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API SERVICE_ROLE_KEY - env var exported by default.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        } 
      }
    )
    
    // Check if bucket exists, create if it doesn't
    try {
      const { data: bucket, error: getBucketError } = await supabaseClient.storage
        .getBucket(bucketName)
      
      if (getBucketError && getBucketError.message.includes('not found')) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabaseClient.storage
          .createBucket(bucketName, { public: true })
        
        if (createError) {
          throw createError
        }
        
        console.log(`Created bucket ${bucketName}`)
      } else if (getBucketError) {
        throw getBucketError
      } else {
        // Update existing bucket to ensure it's public
        const { error: updateError } = await supabaseClient.storage
          .updateBucket(bucketName, { public: true })
          
        if (updateError) {
          throw updateError
        }
        
        console.log(`Updated bucket ${bucketName} to public`)
      }
    } catch (error) {
      console.error(`Error with bucket operation:`, error)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, message: `Public bucket ${bucketName} is ready` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`Error creating or updating bucket:`, error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
