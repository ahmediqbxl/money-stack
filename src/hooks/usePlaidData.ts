
import { useState, useEffect } from 'react';
import { plaidService } from '@/services/plaidService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlaidAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  connected_at: string;
}

interface PlaidTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category?: string;
}

export const usePlaidData = () => {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [plaidAccessToken, setPlaidAccessToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Load stored Plaid access token from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('plaid_access_token');
    if (storedAccessToken) {
      setPlaidAccessToken(storedAccessToken);
    }
  }, []);

  // Fetch data when access token is available
  useEffect(() => {
    if (plaidAccessToken) {
      fetchPlaidData();
    }
  }, [plaidAccessToken]);

  const fetchPlaidData = async () => {
    if (!plaidAccessToken) return;
    
    setIsLoading(true);
    try {
      const data = await plaidService.getAccountsAndTransactions(plaidAccessToken);
      
      // Transform Plaid accounts to our format
      const transformedAccounts: PlaidAccount[] = data.accounts.map(account => ({
        id: account.account_id,
        bank_name: 'Plaid Bank', // In real implementation, this would come from institution info
        account_type: account.subtype || account.type,
        account_number: `****${account.mask || '0000'}`,
        balance: account.balances.current || 0,
        currency: account.balances.iso_currency_code || 'CAD',
        connected_at: new Date().toISOString().split('T')[0],
      }));

      // Transform Plaid transactions to our format
      const transformedTransactions: PlaidTransaction[] = data.transactions.map(transaction => ({
        id: transaction.transaction_id,
        description: transaction.name,
        amount: -transaction.amount, // Plaid uses positive for debits, we use negative
        date: transaction.date,
        merchant: transaction.merchant_name,
        category: transaction.category ? transaction.category[0] : undefined,
      }));

      setAccounts(transformedAccounts);
      setTransactions(transformedTransactions);

      toast({
        title: "Accounts Updated",
        description: `Successfully loaded ${transformedAccounts.length} accounts and ${transformedTransactions.length} transactions.`,
      });
    } catch (error) {
      console.error('Error fetching Plaid data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch account data from Plaid.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaidSuccess = (accessToken: string) => {
    localStorage.setItem('plaid_access_token', accessToken);
    setPlaidAccessToken(accessToken);
  };

  const categorizeTransactions = async () => {
    if (transactions.length === 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: transactions }
      });

      if (error) throw error;

      setTransactions(data.categorizedTransactions);
      toast({
        title: "Transactions Categorized",
        description: "AI has successfully categorized your transactions.",
      });
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      toast({
        title: "Error",
        description: "Failed to categorize transactions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts,
    transactions,
    isLoading,
    fetchPlaidData,
    handlePlaidSuccess,
    categorizeTransactions,
  };
};
