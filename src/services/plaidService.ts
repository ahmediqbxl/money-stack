
import { supabase } from '@/integrations/supabase/client';

interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string;
  };
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  category_id?: string;
}

interface PlaidApiResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
}

interface PlaidLinkTokenRequest {
  client_id: string;
  secret: string;
  client_name: string;
  country_codes: string[];
  language: string;
  user: {
    client_user_id: string;
  };
  products: string[];
}

interface PlaidExchangeTokenRequest {
  client_id: string;
  secret: string;
  public_token: string;
}

class PlaidService {
  private baseUrl = 'https://sandbox.plaid.com';
  private clientId: string = '';
  private secret: string = '';
  private initialized: boolean = false;
  
  constructor() {
    this.initialize();
  }

  // Initialize with credentials from Supabase secrets
  private async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('🔄 Initializing Plaid service...');
      
      // Get credentials from Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('get-plaid-credentials');
      
      console.log('📡 Edge function response:', data);
      console.log('❌ Edge function error:', error);
      
      if (error) {
        console.error('❌ Error getting Plaid credentials from edge function:', error);
        throw new Error(`Failed to get Plaid credentials: ${error.message}`);
      }
      
      if (!data?.client_id || !data?.secret) {
        console.error('❌ No Plaid credentials found in response:', data);
        throw new Error('Plaid credentials not configured properly');
      }
      
      this.clientId = data.client_id;
      this.secret = data.secret;
      this.initialized = true;
      
      console.log('✅ Plaid service initialized with real credentials');
      console.log('🔑 Client ID starts with:', this.clientId.substring(0, 8) + '...');
      console.log('🔐 Secret starts with:', this.secret.substring(0, 8) + '...');
      
      return true;
    } catch (error) {
      console.error('💥 Error initializing Plaid service:', error);
      throw error;
    }
  }

  // Create a link token for Plaid Link
  async createLinkToken(userId: string): Promise<string> {
    await this.initialize();
    
    if (!this.clientId || !this.secret || !this.initialized) {
      throw new Error('Plaid service not properly initialized with credentials');
    }

    try {
      const request: PlaidLinkTokenRequest = {
        client_id: this.clientId,
        secret: this.secret,
        client_name: 'MoneySpread',
        country_codes: ['US', 'CA'],
        language: 'en',
        user: {
          client_user_id: userId,
        },
        products: ['transactions'],
      };

      console.log('🚀 Creating Plaid link token with real API...');
      console.log('📤 Request payload:', { ...request, secret: '[HIDDEN]' });
      
      const response = await fetch(`${this.baseUrl}/link/token/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Plaid API response status:', response.status);
      console.log('📊 Plaid API response data:', data);
      
      if (data.error_code) {
        console.error('❌ Plaid API Error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      if (!data.link_token) {
        throw new Error('No link token received from Plaid API');
      }

      console.log('✅ Successfully created Plaid link token');
      return data.link_token;
    } catch (error) {
      console.error('💥 Error creating link token:', error);
      throw error;
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken: string): Promise<string> {
    await this.initialize();
    
    if (!this.clientId || !this.secret || !this.initialized) {
      throw new Error('Plaid service not properly initialized with credentials');
    }

    try {
      const request: PlaidExchangeTokenRequest = {
        client_id: this.clientId,
        secret: this.secret,
        public_token: publicToken,
      };

      console.log('🔄 Exchanging public token for access token...');
      const response = await fetch(`${this.baseUrl}/link/token/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Token exchange response:', { ...data, access_token: data.access_token ? '[RECEIVED]' : '[MISSING]' });
      
      if (data.error_code) {
        console.error('❌ Plaid token exchange error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      if (!data.access_token) {
        throw new Error('No access token received from Plaid API');
      }

      console.log('✅ Successfully exchanged for access token');
      return data.access_token;
    } catch (error) {
      console.error('💥 Error exchanging public token:', error);
      throw error;
    }
  }

  async getAccountsAndTransactions(accessToken: string): Promise<PlaidApiResponse> {
    console.log('🔍 Fetching Plaid data for access token:', accessToken.substring(0, 15) + '...');
    
    await this.initialize();
    
    if (!this.clientId || !this.secret || !this.initialized) {
      throw new Error('Plaid service not properly initialized with credentials');
    }

    try {
      console.log('🚀 Fetching real data from Plaid sandbox...');

      // Get accounts
      const accountsResponse = await fetch(`${this.baseUrl}/accounts/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          access_token: accessToken,
        }),
      });

      if (!accountsResponse.ok) {
        throw new Error(`Accounts API HTTP error! status: ${accountsResponse.status}`);
      }

      const accountsData = await accountsResponse.json();
      console.log('📊 Accounts API response:', accountsData);
      
      if (accountsData.error_code) {
        console.error('❌ Plaid accounts API error:', accountsData.error_code, '-', accountsData.error_message);
        throw new Error(`Plaid API Error: ${accountsData.error_code} - ${accountsData.error_message}`);
      }

      // Get transactions (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transactionsResponse = await fetch(`${this.baseUrl}/transactions/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          count: 100,
          offset: 0,
        }),
      });

      if (!transactionsResponse.ok) {
        throw new Error(`Transactions API HTTP error! status: ${transactionsResponse.status}`);
      }

      const transactionsData = await transactionsResponse.json();
      console.log('📊 Transactions API response:', transactionsData);
      
      if (transactionsData.error_code) {
        console.error('❌ Plaid transactions API error:', transactionsData.error_code, '-', transactionsData.error_message);
        throw new Error(`Plaid API Error: ${transactionsData.error_code} - ${transactionsData.error_message}`);
      }

      console.log('✅ Successfully fetched real Plaid sandbox data:', {
        accounts: accountsData.accounts.length,
        transactions: transactionsData.transactions.length
      });

      return {
        accounts: accountsData.accounts,
        transactions: transactionsData.transactions,
      };
    } catch (error) {
      console.error('💥 Error fetching Plaid data:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();
