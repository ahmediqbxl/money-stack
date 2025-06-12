
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
    
    const { accessToken, daysBack = 90, maxTransactions = 2000 } = await req.json()
    console.log('📊 Parameters received:', {
      tokenPrefix: accessToken.substring(0, 20) + '...',
      daysBack,
      maxTransactions
    })
    
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

    console.log('📡 Fetching accounts from Plaid Production API...')
    const accountsResponse = await fetch('https://production.plaid.com/accounts/get', {
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
      console.error('❌ Production Accounts API error:', accountsResponse.status, errorText)
      throw new Error(`Production Accounts API error: ${accountsResponse.status}`)
    }

    const accountsData = await accountsResponse.json()
    console.log('✅ Production accounts data received successfully:', {
      accountsCount: accountsData.accounts?.length || 0,
      accounts: accountsData.accounts?.map(acc => ({
        id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        balance: acc.balances?.current
      }))
    })

    // Calculate date range for transactions
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📡 Starting production transaction fetch...', { 
      startDate, 
      endDate, 
      daysBack,
      maxTransactions
    })

    // Fetch transactions - Production API uses different parameters
    console.log('📡 Fetching production transactions...')
    const transactionsResponse = await fetch('https://production.plaid.com/transactions/get', {
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
        // Production API uses 'count' not 'count' and 'offset' - let's use the maximum allowed
        count: Math.min(maxTransactions, 500), // Max 500 per request in production
      }),
    })

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text()
      console.error('❌ Production Transactions API error:', transactionsResponse.status, errorText)
      
      // If transactions fail, we can still return accounts
      console.log('⚠️ Continuing without transactions due to API error')
      return new Response(
        JSON.stringify({
          accounts: accountsData.accounts || [],
          transactions: [],
          metadata: {
            totalTransactions: 0,
            totalAvailable: 0,
            dateRange: { startDate, endDate },
            daysBack,
            requestCount: 1,
            error: 'Transaction fetch failed but accounts retrieved successfully'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const transactionsData = await transactionsResponse.json()
    const allTransactions = transactionsData.transactions || []
    const totalAvailable = transactionsData.total_transactions || 0
    
    console.log('✅ Production transaction fetching completed:', {
      finalCount: allTransactions.length,
      totalAvailable,
      dateRange: `${startDate} to ${endDate}`,
      sampleTransaction: allTransactions[0] ? {
        id: allTransactions[0].transaction_id,
        name: allTransactions[0].name,
        amount: allTransactions[0].amount,
        date: allTransactions[0].date,
        account_id: allTransactions[0].account_id
      } : null
    })

    const responseData = {
      accounts: accountsData.accounts || [],
      transactions: allTransactions,
      metadata: {
        totalTransactions: allTransactions.length,
        totalAvailable,
        dateRange: { startDate, endDate },
        daysBack,
        requestCount: 1
      }
    }

    console.log('🎉 Successfully returning production Plaid data:', {
      accountsCount: responseData.accounts.length,
      transactionsCount: responseData.transactions.length,
      totalAvailable,
      dateRangeDays: daysBack
    })

    return new Response(
      JSON.stringify(responseData),
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
