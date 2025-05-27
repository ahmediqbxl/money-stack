
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

class PlaidService {
  constructor() {
    console.log('🏗️ PlaidService constructor called - using edge functions for API calls');
  }

  async createLinkToken(userId: string): Promise<string> {
    console.log('🚀 createLinkToken called for user:', userId);
    
    try {
      console.log('📡 Calling create-plaid-link-token edge function...');
      
      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId }
      });
      
      console.log('📊 Edge function response:');
      console.log('  - Data:', data);
      console.log('  - Error:', error);
      
      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Edge function error: ${JSON.stringify(error)}`);
      }
      
      if (!data || !data.link_token) {
        console.error('❌ No link token in response:', data);
        throw new Error('No link token received from edge function');
      }

      console.log('✅ Link token created successfully via edge function');
      return data.link_token;
    } catch (error) {
      console.error('💥 createLinkToken failed:', error);
      throw error;
    }
  }

  async exchangePublicToken(publicToken: string): Promise<string> {
    console.log('🔄 exchangePublicToken called with token:', publicToken.substring(0, 20) + '...');
    
    try {
      console.log('📡 Calling exchange-plaid-token edge function...');
      
      const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: { publicToken }
      });
      
      console.log('📊 Token exchange response:');
      console.log('  - Data:', data);
      console.log('  - Error:', error);
      
      if (error) {
        console.error('❌ Token exchange edge function error:', error);
        throw new Error(`Token exchange error: ${JSON.stringify(error)}`);
      }
      
      if (!data || !data.access_token) {
        console.error('❌ No access token in response:', data);
        throw new Error('No access token received from edge function');
      }

      console.log('✅ Access token received via edge function');
      return data.access_token;
    } catch (error) {
      console.error('💥 exchangePublicToken failed:', error);
      throw error;
    }
  }

  async getAccountsAndTransactions(accessToken: string): Promise<PlaidApiResponse> {
    console.log('🔍 getAccountsAndTransactions called with token:', accessToken.substring(0, 20) + '...');
    
    try {
      console.log('📡 Calling fetch-plaid-data edge function...');
      
      const { data, error } = await supabase.functions.invoke('fetch-plaid-data', {
        body: { accessToken }
      });
      
      console.log('📊 Fetch data response:');
      console.log('  - Data:', data);
      console.log('  - Error:', error);
      
      if (error) {
        console.error('❌ Fetch data edge function error:', error);
        throw new Error(`Fetch data error: ${JSON.stringify(error)}`);
      }
      
      if (!data || !data.accounts || !data.transactions) {
        console.error('❌ Invalid data structure in response:', data);
        throw new Error('Invalid data structure received from edge function');
      }

      console.log('✅ Real Plaid data fetched successfully via edge function:', {
        accounts: data.accounts.length,
        transactions: data.transactions.length
      });

      return {
        accounts: data.accounts,
        transactions: data.transactions,
      };
    } catch (error) {
      console.error('💥 getAccountsAndTransactions failed:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();
