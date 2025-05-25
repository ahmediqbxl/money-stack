
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
  private baseUrl = 'https://sandbox.plaid.com'; // Using sandbox for testing
  
  async getAccountsAndTransactions(accessToken: string): Promise<PlaidApiResponse> {
    console.log('Fetching Plaid data for access token:', accessToken);
    
    try {
      // For sandbox/demo mode, return mock data that looks realistic
      if (accessToken.startsWith('sandbox_')) {
        return this.getSandboxData();
      }

      // In a real implementation, you would make actual Plaid API calls here
      // For now, we'll use sandbox data
      return this.getSandboxData();
    } catch (error) {
      console.error('Error fetching Plaid data:', error);
      return this.getSandboxData();
    }
  }

  private getSandboxData(): PlaidApiResponse {
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
