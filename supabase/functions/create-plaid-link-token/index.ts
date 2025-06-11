
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
    console.log('🔄 create-plaid-link-token function called')
    
    const { userId } = await req.json()
    console.log('📊 User ID:', userId)
    
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

    console.log('🏗️ Building link token request...')
    const request = {
      client_id: clientId,
      secret: secret,
      client_name: 'MoneySpread',
      country_codes: ['US', 'CA'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      products: ['transactions'],
    }

    console.log('🌐 Making request to Plaid Production API...')
    const response = await fetch('https://production.plaid.com/link/token/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log('📥 Plaid Production API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Plaid Production API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Plaid Production API error: ${response.status}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        },
      )
    }

    const data = await response.json()
    console.log('📊 Plaid Production API response received')
    
    if (data.error_code) {
      console.error('❌ Plaid Production API error:', data.error_code, '-', data.error_message)
      return new Response(
        JSON.stringify({ error: `${data.error_code}: ${data.error_message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('✅ Production link token created successfully')
    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in create-plaid-link-token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
