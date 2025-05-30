
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

    // Get transactions for the last 30 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📡 Fetching transactions from Plaid...', { startDate, endDate })
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
      }),
    })

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text()
      console.error('❌ Transactions API error:', transactionsResponse.status, errorText)
      throw new Error(`Transactions API error: ${transactionsResponse.status}`)
    }

    const transactionsData = await transactionsResponse.json()
    console.log('✅ Transactions data received successfully:', {
      transactionsCount: transactionsData.transactions?.length || 0,
      totalTransactions: transactionsData.total_transactions,
      sampleTransaction: transactionsData.transactions?.[0] ? {
        id: transactionsData.transactions[0].transaction_id,
        name: transactionsData.transactions[0].name,
        amount: transactionsData.transactions[0].amount,
        date: transactionsData.transactions[0].date,
        account_id: transactionsData.transactions[0].account_id
      } : null
    })

    const responseData = {
      accounts: accountsData.accounts || [],
      transactions: transactionsData.transactions || [],
    }

    console.log('🎉 Successfully returning Plaid data:', {
      accountsCount: responseData.accounts.length,
      transactionsCount: responseData.transactions.length
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
