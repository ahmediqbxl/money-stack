
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
    console.log('🔄 fetch-plaid-data function called')
    
    const { accessToken } = await req.json()
    console.log('📊 Access token received:', accessToken.substring(0, 20) + '...')
    
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

    console.log('📡 Fetching accounts...')
    const accountsResponse = await fetch('https://sandbox.plaid.com/accounts/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        secret: secret,
        access_token: accessToken,
      }),
    })

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      console.error('❌ Accounts API error:', accountsResponse.status, errorText)
      throw new Error(`Accounts API error: ${accountsResponse.status}`)
    }

    const accountsData = await accountsResponse.json()
    console.log('📊 Accounts data received:', accountsData.accounts?.length || 0, 'accounts')

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📡 Fetching transactions...')
    const transactionsResponse = await fetch('https://sandbox.plaid.com/transactions/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        secret: secret,
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        count: 100,
        offset: 0,
      }),
    })

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text()
      console.error('❌ Transactions API error:', transactionsResponse.status, errorText)
      throw new Error(`Transactions API error: ${transactionsResponse.status}`)
    }

    const transactionsData = await transactionsResponse.json()
    console.log('📊 Transactions data received:', transactionsData.transactions?.length || 0, 'transactions')

    console.log('✅ Real Plaid data fetched successfully')
    return new Response(
      JSON.stringify({
        accounts: accountsData.accounts,
        transactions: transactionsData.transactions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in fetch-plaid-data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
