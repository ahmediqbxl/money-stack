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
        return false;
      }
      
      if (data?.client_id && data?.secret) {
        this.clientId = data.client_id;
        this.secret = data.secret;
        this.initialized = true;
        console.log('✅ Plaid service initialized with real credentials');
        console.log('🔑 Client ID starts with:', this.clientId.substring(0, 8) + '...');
        console.log('🔐 Secret starts with:', this.secret.substring(0, 8) + '...');
        return true;
      }
      
      console.log('⚠️ No Plaid credentials found in response, using mock sandbox data');
      console.log('📊 Response data:', data);
      return false;
    } catch (error) {
      console.error('💥 Error initializing Plaid service:', error);
      return false;
    }
  }

  // Create a link token for Plaid Link
  async createLinkToken(userId: string): Promise<string> {
    await this.initialize();
    
    if (!this.clientId || !this.secret || !this.initialized) {
      console.log('🎭 Using mock link token - no real credentials available');
      return `link-sandbox-${Date.now()}`;
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

      const data = await response.json();
      console.log('📥 Plaid API response status:', response.status);
      console.log('📊 Plaid API response data:', data);
      
      if (data.error_code) {
        console.error('❌ Plaid API Error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      console.log('✅ Successfully created Plaid link token');
      return data.link_token;
    } catch (error) {
      console.error('💥 Error creating link token:', error);
      // Fallback to mock token
      console.log('🎭 Falling back to mock token due to error');
      return `link-sandbox-${Date.now()}`;
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken: string): Promise<string> {
    await this.initialize();
    
    if (!this.clientId || !this.secret || publicToken.startsWith('public_sandbox_') || !this.initialized) {
      console.log('🎭 Using mock access token');
      return `access-sandbox-${Date.now()}`;
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

      const data = await response.json();
      console.log('📥 Token exchange response:', { ...data, access_token: data.access_token ? '[RECEIVED]' : '[MISSING]' });
      
      if (data.error_code) {
        console.error('❌ Plaid token exchange error:', data.error_code, '-', data.error_message);
        throw new Error(`Plaid API Error: ${data.error_code} - ${data.error_message}`);
      }

      console.log('✅ Successfully exchanged for access token');
      return data.access_token;
    } catch (error) {
      console.error('💥 Error exchanging public token:', error);
      // Fallback to mock token
      return `access-sandbox-${Date.now()}`;
    }
  }

  async getAccountsAndTransactions(accessToken: string): Promise<PlaidApiResponse> {
    console.log('🔍 Fetching Plaid data for access token:', accessToken.substring(0, 15) + '...');
    
    await this.initialize();
    
    try {
      // For sandbox/demo mode, return mock data that looks realistic
      if (accessToken.startsWith('access-sandbox-') || !this.clientId || !this.secret || !this.initialized) {
        console.log('🎭 Using mock sandbox data');
        return this.getSandboxData();
      }

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
      // Fallback to sandbox data on error
      console.log('🎭 Falling back to mock data due to error');
      return this.getSandboxData();
    }
  }

  private getSandboxData(): PlaidApiResponse {
    console.log('🎭 Returning mock sandbox data');
    // ... keep existing code (mock data generation)
    return {
      accounts: [
        {
          account_id: 'plaid_checking_001',
          balances: {
            available: 2743.67,
            current: 2843.67,
            iso_currency_code: 'CAD'
          },
          name: 'Plaid Checking',
          official_name: 'Plaid Gold Standard 0% Interest Checking',
          type: 'depository',
          subtype: 'checking',
          mask: '0000'
        },
        {
          account_id: 'plaid_savings_001',
          balances: {
            available: 8456.23,
            current: 8456.23,
            iso_currency_code: 'CAD'
          },
          name: 'Plaid Saving',
          official_name: 'Plaid Silver Standard 0.1% Interest Saving',
          type: 'depository',
          subtype: 'savings',
          mask: '1111'
        },
        {
          account_id: 'plaid_credit_001',
          balances: {
            available: 4643.50,
            current: -356.50,
            iso_currency_code: 'CAD'
          },
          name: 'Plaid Credit Card',
          official_name: 'Plaid Diamond 12.5% APR Interest Credit Card',
          type: 'credit',
          subtype: 'credit card',
          mask: '3333'
        }
      ],
      transactions: [
        {
          transaction_id: 'plaid_trans_001',
          account_id: 'plaid_checking_001',
          amount: 67.43,
          date: '2024-01-23',
          name: 'Loblaws',
          merchant_name: 'Loblaws',
          category: ['Shops', 'Food and Beverage Store', 'Supermarkets and Groceries']
        },
        {
          transaction_id: 'plaid_trans_002',
          account_id: 'plaid_checking_001',
          amount: 12.50,
          date: '2024-01-22',
          name: 'Tim Hortons',
          merchant_name: 'Tim Hortons',
          category: ['Food and Drink', 'Restaurants', 'Coffee Shop']
        },
        {
          transaction_id: 'plaid_trans_003',
          account_id: 'plaid_checking_001',
          amount: 34.99,
          date: '2024-01-22',
          name: 'Shoppers Drug Mart',
          merchant_name: 'Shoppers Drug Mart',
          category: ['Shops', 'Pharmacies']
        },
        {
          transaction_id: 'plaid_trans_004',
          account_id: 'plaid_checking_001',
          amount: 3.35,
          date: '2024-01-21',
          name: 'TTC Subway',
          merchant_name: 'TTC',
          category: ['Transportation', 'Public Transportation']
        },
        {
          transaction_id: 'plaid_trans_005',
          account_id: 'plaid_checking_001',
          amount: -2800.00,
          date: '2024-01-20',
          name: 'Direct Deposit - Salary',
          merchant_name: 'Employer',
          category: ['Deposit', 'Payroll']
        },
        {
          transaction_id: 'plaid_trans_006',
          account_id: 'plaid_credit_001',
          amount: 16.99,
          date: '2024-01-19',
          name: 'Netflix',
          merchant_name: 'Netflix',
          category: ['Service', 'Entertainment', 'TV and Movies']
        },
        {
          transaction_id: 'plaid_trans_007',
          account_id: 'plaid_credit_001',
          amount: 89.24,
          date: '2024-01-18',
          name: 'Canadian Tire',
          merchant_name: 'Canadian Tire',
          category: ['Shops', 'General Merchandise', 'Department Stores']
        },
        {
          transaction_id: 'plaid_trans_008',
          account_id: 'plaid_checking_001',
          amount: 75.00,
          date: '2024-01-17',
          name: 'Bell Canada',
          merchant_name: 'Bell Canada',
          category: ['Service', 'Telecommunication Services']
        }
      ]
    };
  }
}

export const plaidService = new PlaidService();
