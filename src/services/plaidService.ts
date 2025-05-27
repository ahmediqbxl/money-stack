
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
    console.log('🏗️ PlaidService constructor called');
  }

  private async initialize() {
    if (this.initialized) {
      console.log('✅ PlaidService already initialized');
      return true;
    }
    
    try {
      console.log('🔄 Starting PlaidService initialization...');
      console.log('📡 Calling get-plaid-credentials edge function...');
      
      const { data, error } = await supabase.functions.invoke('get-plaid-credentials');
      
      console.log('📊 Edge function invoke result:');
      console.log('  - Data:', data);
      console.log('  - Error:', error);
      console.log('  - Data type:', typeof data);
      console.log('  - Data keys:', data ? Object.keys(data) : 'N/A');
      
      if (error) {
        console.error('❌ Supabase function invoke error:', error);
        throw new Error(`Edge function error: ${JSON.stringify(error)}`);
      }
      
      if (!data) {
        console.error('❌ No data returned from edge function');
        throw new Error('No data returned from get-plaid-credentials');
      }

      console.log('🔍 Checking credentials in response...');
      console.log('  - client_id exists:', !!data.client_id);
      console.log('  - secret exists:', !!data.secret);
      console.log('  - client_id type:', typeof data.client_id);
      console.log('  - secret type:', typeof data.secret);
      
      if (data.client_id) {
        console.log('  - client_id length:', data.client_id.length);
        console.log('  - client_id preview:', data.client_id.substring(0, 8) + '...');
      }
      
      if (data.secret) {
        console.log('  - secret length:', data.secret.length);
        console.log('  - secret preview:', data.secret.substring(0, 8) + '...');
      }
      
      if (!data.client_id || !data.secret) {
        console.error('❌ Missing Plaid credentials in response');
        console.error('Full response:', JSON.stringify(data, null, 2));
        throw new Error('Plaid credentials not found in edge function response');
      }
      
      this.clientId = data.client_id;
      this.secret = data.secret;
      this.initialized = true;
      
      console.log('✅ PlaidService initialized successfully');
      console.log('🔑 Using client ID:', this.clientId.substring(0, 8) + '...');
      console.log('🔐 Using secret:', this.secret.substring(0, 8) + '...');
      
      return true;
    } catch (error) {
      console.error('💥 PlaidService initialization failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  async createLinkToken(userId: string): Promise<string> {
    console.log('🚀 createLinkToken called for user:', userId);
    
    try {
      await this.initialize();
      
      console.log('🏗️ Building link token request...');
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

      const requestForLogging = { ...request, secret: '[HIDDEN]' };
      console.log('📤 Plaid API request:', requestForLogging);
      console.log('🌐 Making request to:', `${this.baseUrl}/link/token/create`);
      
      const response = await fetch(`${this.baseUrl}/link/token/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('📥 Plaid API response status:', response.status);
      console.log('📥 Plaid API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Plaid API HTTP error:', response.status, errorText);
        throw new Error(`Plaid API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Plaid API response data:', data);
      
      if (data.error_code) {
        console.error('❌ Plaid API error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      if (!data.link_token) {
        console.error('❌ No link token in response:', data);
        throw new Error('No link token received from Plaid API');
      }

      console.log('✅ Link token created successfully:', data.link_token.substring(0, 20) + '...');
      return data.link_token;
    } catch (error) {
      console.error('💥 createLinkToken failed:', error);
      throw error;
    }
  }

  async exchangePublicToken(publicToken: string): Promise<string> {
    console.log('🔄 exchangePublicToken called with token:', publicToken.substring(0, 20) + '...');
    
    try {
      await this.initialize();
      
      const request: PlaidExchangeTokenRequest = {
        client_id: this.clientId,
        secret: this.secret,
        public_token: publicToken,
      };

      console.log('📤 Token exchange request to:', `${this.baseUrl}/link/token/exchange`);
      
      const response = await fetch(`${this.baseUrl}/link/token/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('📥 Token exchange response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange HTTP error:', response.status, errorText);
        throw new Error(`Token exchange HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Token exchange response:', { ...data, access_token: data.access_token ? '[RECEIVED]' : '[MISSING]' });
      
      if (data.error_code) {
        console.error('❌ Token exchange API error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      if (!data.access_token) {
        console.error('❌ No access token in response:', data);
        throw new Error('No access token received from Plaid API');
      }

      console.log('✅ Access token received:', data.access_token.substring(0, 20) + '...');
      return data.access_token;
    } catch (error) {
      console.error('💥 exchangePublicToken failed:', error);
      throw error;
    }
  }

  async getAccountsAndTransactions(accessToken: string): Promise<PlaidApiResponse> {
    console.log('🔍 getAccountsAndTransactions called with token:', accessToken.substring(0, 20) + '...');
    
    try {
      await this.initialize();

      console.log('📡 Fetching accounts from:', `${this.baseUrl}/accounts/get`);
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

      console.log('📥 Accounts response status:', accountsResponse.status);

      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error('❌ Accounts API error:', accountsResponse.status, errorText);
        throw new Error(`Accounts API HTTP ${accountsResponse.status}: ${errorText}`);
      }

      const accountsData = await accountsResponse.json();
      console.log('📊 Accounts data:', accountsData);
      
      if (accountsData.error_code) {
        console.error('❌ Accounts API error:', accountsData.error_code, '-', accountsData.error_message);
        throw new Error(`Plaid API Error: ${accountsData.error_code} - ${accountsData.error_message}`);
      }

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('📡 Fetching transactions from:', `${this.baseUrl}/transactions/get`);
      console.log('📅 Date range:', startDate, 'to', endDate);

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

      console.log('📥 Transactions response status:', transactionsResponse.status);

      if (!transactionsResponse.ok) {
        const errorText = await transactionsResponse.text();
        console.error('❌ Transactions API error:', transactionsResponse.status, errorText);
        throw new Error(`Transactions API HTTP ${transactionsResponse.status}: ${errorText}`);
      }

      const transactionsData = await transactionsResponse.json();
      console.log('📊 Transactions data:', transactionsData);
      
      if (transactionsData.error_code) {
        console.error('❌ Transactions API error:', transactionsData.error_code, '-', transactionsData.error_message);
        throw new Error(`Plaid API Error: ${transactionsData.error_code} - ${transactionsData.error_message}`);
      }

      console.log('✅ Real Plaid data fetched successfully:', {
        accounts: accountsData.accounts.length,
        transactions: transactionsData.transactions.length
      });

      return {
        accounts: accountsData.accounts,
        transactions: transactionsData.transactions,
      };
    } catch (error) {
      console.error('💥 getAccountsAndTransactions failed:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();
