
import { useState, useEffect, useCallback } from 'react';
import { plaidService } from '@/services/plaidService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/hooks/useDatabase';

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
  const [isLoading, setIsLoading] = useState(false);
  const [plaidAccessToken, setPlaidAccessToken] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();
  const { 
    accounts, 
    transactions, 
    saveAccount, 
    saveTransactions, 
    updateTransactionCategory 
  } = useDatabase();

  // Load stored Plaid access token from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('plaid_access_token');
    if (storedAccessToken) {
      setPlaidAccessToken(storedAccessToken);
    }
  }, []);

  const fetchPlaidData = useCallback(async () => {
    const currentToken = plaidAccessToken || localStorage.getItem('plaid_access_token');
    
    if (!currentToken || isLoading) {
      console.log('Cannot fetch Plaid data:', { hasToken: !!currentToken, isLoading });
      return;
    }
    
    console.log('Starting Plaid data fetch...');
    setIsLoading(true);
    
    try {
      const data = await plaidService.getAccountsAndTransactions(currentToken);
      console.log('Plaid data received:', data);
      
      // Save accounts to database with better duplicate checking
      const accountPromises = data.accounts.map(async (account) => {
        const dbAccount = {
          external_account_id: account.account_id,
          bank_name: 'Plaid Bank',
          account_type: account.subtype || account.type,
          account_number: `****${account.mask || '0000'}`,
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'CAD',
          provider: 'plaid' as const,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          is_active: true,
        };
        
        return saveAccount(dbAccount);
      });

      const savedAccounts = await Promise.all(accountPromises);
      console.log('Saved accounts:', savedAccounts);

      // Transform and save transactions with better duplicate handling
      const transformedTransactions = data.transactions.map(transaction => {
        const accountId = savedAccounts.find(
          acc => acc.external_account_id === transaction.account_id
        )?.id;

        return {
          account_id: accountId!,
          external_transaction_id: transaction.transaction_id,
          description: transaction.name,
          amount: -transaction.amount, // Plaid uses positive for debits
          date: transaction.date,
          merchant: transaction.merchant_name,
          category_name: transaction.category ? transaction.category[0] : undefined,
          is_manual_category: false,
        };
      }).filter(t => t.account_id); // Filter out transactions without valid account_id

      if (transformedTransactions.length > 0) {
        const savedTransactions = await saveTransactions(transformedTransactions);
        console.log('Saved transactions:', savedTransactions);
      }

      setHasFetched(true);
      
      toast({
        title: "Accounts Updated",
        description: `Successfully loaded ${savedAccounts.length} accounts and ${transformedTransactions.length} transactions.`,
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
  }, [plaidAccessToken, isLoading, saveAccount, saveTransactions, toast]);

  const handlePlaidSuccess = (accessToken: string) => {
    console.log('Plaid success, storing token:', accessToken);
    localStorage.setItem('plaid_access_token', accessToken);
    setPlaidAccessToken(accessToken);
    setHasFetched(false); // Reset to allow fetching with new token
  };

  const categorizeTransactions = async () => {
    if (transactions.length === 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: transactions }
      });

      if (error) throw error;

      // Update transactions with AI categories
      const updatePromises = data.categorizedTransactions.map((catTrans: any) => {
        const originalTrans = transactions.find(t => 
          t.description === catTrans.description && 
          Math.abs(t.amount - Math.abs(catTrans.amount)) < 0.01
        );
        
        if (originalTrans && catTrans.category && !originalTrans.is_manual_category) {
          return updateTransactionCategory(originalTrans.id, catTrans.category);
        }
      }).filter(Boolean);

      await Promise.all(updatePromises);

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
