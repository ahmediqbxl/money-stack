
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
    try {
      // Get accounts
      const accountsResponse = await fetch(`${this.baseUrl}/accounts/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: loginId,
        }),
      });

      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts from Flinks');
      }

      const accountsData = await accountsResponse.json();
      
      // Get transactions for each account
      const transactionsPromises = accountsData.accounts.map(async (account: FlinksAccount) => {
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
      });

      const allTransactions = await Promise.all(transactionsPromises);
      const flatTransactions = allTransactions.flat();

      return {
        accounts: accountsData.accounts || [],
        transactions: flatTransactions,
      };
    } catch (error) {
      console.error('Error fetching Flinks data:', error);
      throw error;
    }
  }
}

export const flinksService = new FlinksService();
