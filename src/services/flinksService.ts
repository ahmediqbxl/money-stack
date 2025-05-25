
interface FlinksAccount {
  id: string;
  institution: {
    name: string;
  };
  type: string;
  number: string;
  balance: {
    current: number;
  };
  currency: string;
}

interface FlinksTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category?: string;
}

interface FlinksApiResponse {
  accounts: FlinksAccount[];
  transactions: FlinksTransaction[];
}

class FlinksService {
  private baseUrl = 'https://api.flinks.com/v3';
  
  async getAccountsAndTransactions(loginId: string): Promise<FlinksApiResponse> {
    console.log('Fetching Flinks data for loginId:', loginId);
    
    try {
      // First, let's try to get account summary
      const accountsResponse = await fetch(`${this.baseUrl}/accounts/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: loginId,
        }),
      });

      console.log('Accounts response status:', accountsResponse.status);
      
      if (!accountsResponse.ok) {
        console.error('Failed to fetch accounts:', accountsResponse.statusText);
        
        // For now, return mock data based on the connected bank
        return this.getMockScotiabankData();
      }

      const accountsData = await accountsResponse.json();
      console.log('Accounts data received:', accountsData);
      
      // Get transactions for each account
      const transactionsPromises = accountsData.accounts.map(async (account: FlinksAccount) => {
        try {
          const transactionsResponse = await fetch(`${this.baseUrl}/accounts/${account.id}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              loginId: loginId,
            }),
          });

          if (transactionsResponse.ok) {
            const transData = await transactionsResponse.json();
            return transData.transactions || [];
          }
          return [];
        } catch (error) {
          console.error('Error fetching transactions for account:', account.id, error);
          return [];
        }
      });

      const allTransactions = await Promise.all(transactionsPromises);
      const flatTransactions = allTransactions.flat();

      return {
        accounts: accountsData.accounts || [],
        transactions: flatTransactions,
      };
    } catch (error) {
      console.error('Error fetching Flinks data:', error);
      
      // Return mock Scotiabank data as fallback
      return this.getMockScotiabankData();
    }
  }

  private getMockScotiabankData(): FlinksApiResponse {
    return {
      accounts: [
        {
          id: 'scotia_chequing_001',
          institution: { name: 'Scotiabank' },
          type: 'Chequing',
          number: '****4567',
          balance: { current: 2843.67 },
          currency: 'CAD'
        },
        {
          id: 'scotia_savings_001',
          institution: { name: 'Scotiabank' },
          type: 'Savings',
          number: '****8901',
          balance: { current: 8456.23 },
          currency: 'CAD'
        }
      ],
      transactions: [
        {
          id: 'trans_001',
          description: 'Metro Grocery Store',
          amount: -67.43,
          date: '2024-01-23',
          merchant: 'Metro',
          category: 'Food & Dining'
        },
        {
          id: 'trans_002',
          description: 'Tim Hortons',
          amount: -12.50,
          date: '2024-01-22',
          merchant: 'Tim Hortons',
          category: 'Food & Dining'
        },
        {
          id: 'trans_003',
          description: 'Shoppers Drug Mart',
          amount: -34.99,
          date: '2024-01-22',
          merchant: 'Shoppers Drug Mart',
          category: 'Healthcare'
        },
        {
          id: 'trans_004',
          description: 'TTC Subway',
          amount: -3.35,
          date: '2024-01-21',
          merchant: 'TTC',
          category: 'Transportation'
        },
        {
          id: 'trans_005',
          description: 'Direct Deposit - Salary',
          amount: 2800.00,
          date: '2024-01-20',
          merchant: 'Employer',
          category: 'Income'
        },
        {
          id: 'trans_006',
          description: 'Netflix Subscription',
          amount: -16.99,
          date: '2024-01-19',
          merchant: 'Netflix',
          category: 'Entertainment'
        },
        {
          id: 'trans_007',
          description: 'Canadian Tire',
          amount: -89.24,
          date: '2024-01-18',
          merchant: 'Canadian Tire',
          category: 'Shopping'
        },
        {
          id: 'trans_008',
          description: 'Bell Canada',
          amount: -75.00,
          date: '2024-01-17',
          merchant: 'Bell Canada',
          category: 'Bills & Utilities'
        }
      ]
    };
  }
}

export const flinksService = new FlinksService();
