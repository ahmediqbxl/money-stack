
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Getting Plaid credentials from environment...')
    
    // Get Plaid credentials from environment variables
    const clientId = Deno.env.get('PLAID_CLIENT_ID')
    const secret = Deno.env.get('PLAID_SECRET_KEY')

    console.log('Plaid Client ID exists:', !!clientId)
    console.log('Plaid Secret exists:', !!secret)
    console.log('Client ID length:', clientId ? clientId.length : 0)
    console.log('Secret length:', secret ? secret.length : 0)

    if (!clientId || !secret) {
      console.log('Missing Plaid credentials - returning null values')
      return new Response(
        JSON.stringify({ 
          error: 'Plaid credentials not configured',
          client_id: null,
          secret: null,
          debug: {
            hasClientId: !!clientId,
            hasSecret: !!secret
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('Returning Plaid credentials successfully')
    return new Response(
      JSON.stringify({
        client_id: clientId,
        secret: secret,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-plaid-credentials:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        client_id: null,
        secret: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
