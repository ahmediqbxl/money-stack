
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
    console.log('🔄 exchange-plaid-token function called')
    
    const { publicToken } = await req.json()
    console.log('📊 Public token received:', publicToken.substring(0, 20) + '...')
    
    // Get Plaid credentials from environment
    const clientId = Deno.env.get('PLAID_CLIENT_ID')
    const secret = Deno.env.get('PLAID_SECRET_KEY')

    if (!clientId || !secret) {
      console.error('❌ Missing Plaid credentials')
      return new Response(
        JSON.stringify({ error: 'Plaid credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    console.log('🔄 Exchanging public token...')
    const request = {
      client_id: clientId,
      secret: secret,
      public_token: publicToken,
    }

    console.log('🌐 Making request to Plaid API...')
    // Fixed the endpoint URL - the correct endpoint is /link/token/exchange
    const response = await fetch('https://sandbox.plaid.com/link/token/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log('📥 Token exchange response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token exchange error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Token exchange error: ${response.status}`, details: errorText }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        },
      )
    }

    const data = await response.json()
    console.log('📊 Token exchange response received:', data)
    
    if (data.error_code) {
      console.error('❌ Token exchange API error:', data.error_code, '-', data.error_message)
      return new Response(
        JSON.stringify({ error: `${data.error_code}: ${data.error_message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('✅ Access token received successfully')
    return new Response(
      JSON.stringify({ access_token: data.access_token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in exchange-plaid-token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
