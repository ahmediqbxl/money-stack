
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

  const fetchPlaidData = useCallback(async (accessToken?: string) => {
    // Use provided token or stored token
    const tokenToUse = accessToken || plaidAccessToken || localStorage.getItem('plaid_access_token');
    
    if (!tokenToUse || isLoading) {
      console.log('Cannot fetch Plaid data:', { hasToken: !!tokenToUse, isLoading });
      return;
    }
    
    console.log('🚀 Starting Plaid data fetch with token:', tokenToUse.substring(0, 20) + '...');
    setIsLoading(true);
    
    try {
      const data = await plaidService.getAccountsAndTransactions(tokenToUse);
      console.log('📊 Raw Plaid data received:', {
        accountsCount: data.accounts.length,
        transactionsCount: data.transactions.length,
        sampleAccount: data.accounts[0],
        sampleTransaction: data.transactions[0]
      });
      
      // Save accounts to database with better duplicate checking
      console.log('💾 Starting to save accounts...');
      const accountPromises = data.accounts.map(async (account, index) => {
        console.log(`💾 Processing account ${index + 1}:`, {
          account_id: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balance: account.balances.current
        });

        const dbAccount = {
          external_account_id: account.account_id,
          bank_name: account.name || 'Plaid Bank',
          account_type: account.subtype || account.type,
          account_number: `****${account.mask || '0000'}`,
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'CAD',
          provider: 'plaid' as const,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          is_active: true,
        };
        
        console.log(`💾 Saving account ${index + 1} to database:`, dbAccount);
        return saveAccount(dbAccount);
      });

      const savedAccounts = await Promise.all(accountPromises);
      console.log('✅ Accounts saved successfully:', {
        count: savedAccounts.length,
        accounts: savedAccounts.map(acc => ({ id: acc.id, external_id: acc.external_account_id }))
      });

      // Transform and save transactions with better duplicate handling
      console.log('💾 Starting to transform and save transactions...');
      const transformedTransactions = data.transactions.map((transaction, index) => {
        const accountId = savedAccounts.find(
          acc => acc.external_account_id === transaction.account_id
        )?.id;

        console.log(`💾 Processing transaction ${index + 1}:`, {
          transaction_id: transaction.transaction_id,
          name: transaction.name,
          amount: transaction.amount,
          account_id: transaction.account_id,
          mapped_account_id: accountId
        });

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
      }).filter(t => {
        if (!t.account_id) {
          console.warn('⚠️ Filtered out transaction without valid account_id:', t);
        }
        return t.account_id;
      });

      console.log('📊 Transformed transactions for database:', {
        originalCount: data.transactions.length,
        transformedCount: transformedTransactions.length,
        sample: transformedTransactions.slice(0, 3)
      });

      if (transformedTransactions.length > 0) {
        console.log('💾 Saving transactions to database...');
        const savedTransactions = await saveTransactions(transformedTransactions);
        console.log('✅ Transactions saved successfully:', {
          count: savedTransactions.length,
          sample: savedTransactions.slice(0, 3).map(t => ({ 
            id: t.id, 
            description: t.description, 
            amount: t.amount 
          }))
        });
      } else {
        console.log('⚠️ No transactions to save after transformation');
      }

      setHasFetched(true);
      
      toast({
        title: "Accounts Updated",
        description: `Successfully loaded ${savedAccounts.length} accounts and ${transformedTransactions.length} transactions.`,
      });

      console.log('🎉 Plaid data fetch and save completed successfully!');
    } catch (error) {
      console.error('💥 Error fetching Plaid data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch account data from Plaid.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [plaidAccessToken, isLoading, saveAccount, saveTransactions, toast]);

  const handlePlaidSuccess = async (accessToken: string) => {
    console.log('🎯 Plaid success, storing token and immediately fetching data:', accessToken.substring(0, 20) + '...');
    localStorage.setItem('plaid_access_token', accessToken);
    setPlaidAccessToken(accessToken);
    setHasFetched(false); // Reset to allow fetching with new token
    
    // Immediately fetch data with the new token
    console.log('🚀 Triggering immediate data fetch...');
    await fetchPlaidData(accessToken);
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
