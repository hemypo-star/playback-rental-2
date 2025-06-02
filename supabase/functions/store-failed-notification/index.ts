
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, data, error_message, attempts } = await req.json();

    if (!type || !data) {
      throw new Error('Type and data are required');
    }

    console.log('Storing failed notification:', { type, attempts, error_message });

    const { error } = await supabaseClient
      .from('failed_notifications')
      .insert({
        type,
        data: JSON.stringify(data),
        error_message,
        attempts: attempts || 0,
        status: 'failed'
      });

    if (error) {
      console.error('Database error storing failed notification:', error);
      throw error;
    }

    console.log('Failed notification stored successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Failed notification stored successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
