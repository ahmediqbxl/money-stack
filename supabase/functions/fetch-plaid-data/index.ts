
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

    console.log('📡 Fetching accounts from Plaid...')
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
    console.log('✅ Accounts data received successfully:', {
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

    console.log('📡 Starting transaction fetch with pagination...', { 
      startDate, 
      endDate, 
      daysBack,
      maxTransactions
    })

    // Fetch transactions with pagination
    let allTransactions = []
    let offset = 0
    const batchSize = 500 // Maximum per request
    let totalAvailable = 0
    let requestCount = 0

    while (allTransactions.length < maxTransactions) {
      requestCount++
      const remainingToFetch = Math.min(batchSize, maxTransactions - allTransactions.length)
      
      console.log(`📡 Fetching transaction batch ${requestCount}:`, {
        offset,
        count: remainingToFetch,
        alreadyFetched: allTransactions.length,
        maxTransactions
      })

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
          count: remainingToFetch,
          offset: offset,
        }),
      })

      if (!transactionsResponse.ok) {
        const errorText = await transactionsResponse.text()
        console.error('❌ Transactions API error:', transactionsResponse.status, errorText)
        throw new Error(`Transactions API error: ${transactionsResponse.status}`)
      }

      const transactionsData = await transactionsResponse.json()
      totalAvailable = transactionsData.total_transactions || 0
      
      console.log(`✅ Transaction batch ${requestCount} received:`, {
        batchSize: transactionsData.transactions?.length || 0,
        totalFetched: allTransactions.length + (transactionsData.transactions?.length || 0),
        totalAvailable,
        hasMore: totalAvailable > allTransactions.length + (transactionsData.transactions?.length || 0)
      })

      // Add transactions to our collection
      if (transactionsData.transactions && transactionsData.transactions.length > 0) {
        allTransactions = allTransactions.concat(transactionsData.transactions)
        offset += transactionsData.transactions.length
      } else {
        console.log('📋 No more transactions in this batch, stopping pagination')
        break
      }

      // Check if we've fetched everything available
      if (allTransactions.length >= totalAvailable) {
        console.log('📋 Fetched all available transactions')
        break
      }

      // Safety check to prevent infinite loops
      if (requestCount >= 10) {
        console.log('⚠️ Maximum request count reached, stopping pagination')
        break
      }
    }

    console.log('🎯 Transaction fetching completed:', {
      totalRequests: requestCount,
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
        requestCount
      }
    }

    console.log('🎉 Successfully returning enhanced Plaid data:', {
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
