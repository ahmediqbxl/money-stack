
import { useState, useEffect } from 'react';
import { flinksService } from '@/services/flinksService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/hooks/useDatabase';

interface FlinksAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  connected_at: string;
}

interface FlinksTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category?: string;
}

export const useFlinksData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [flinksLoginId, setFlinksLoginId] = useState<string | null>(null);
  const { toast } = useToast();
  const { 
    accounts, 
    transactions, 
    saveAccount, 
    saveTransactions, 
    updateTransactionCategory 
  } = useDatabase();

  // Load stored Flinks login ID from localStorage
  useEffect(() => {
    const storedLoginId = localStorage.getItem('flinks_login_id');
    if (storedLoginId) {
      setFlinksLoginId(storedLoginId);
    }
  }, []);

  // Fetch data when login ID is available
  useEffect(() => {
    if (flinksLoginId && accounts.length === 0) {
      fetchFlinksData();
    }
  }, [flinksLoginId, accounts.length]);

  const fetchFlinksData = async () => {
    if (!flinksLoginId) return;
    
    setIsLoading(true);
    try {
      const data = await flinksService.getAccountsAndTransactions(flinksLoginId);
      
      // Save accounts to database
      const accountPromises = data.accounts.map(async (account) => {
        const dbAccount = {
          external_account_id: account.id,
          bank_name: account.institution.name,
          account_type: account.type,
          account_number: `****${account.number.slice(-4)}`,
          balance: account.balance.current,
          currency: account.currency,
          provider: 'flinks' as const,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          is_active: true,
        };
        
        return saveAccount(dbAccount);
      });

      const savedAccounts = await Promise.all(accountPromises);

      // Transform and save transactions - using mock data for demo
      const mockTransactions = [
        {
          id: 'flinks_trans_001',
          account_id: savedAccounts[0]?.id || '',
          description: 'Metro Grocery Store',
          amount: -67.43,
          date: '2024-01-23',
          merchant: 'Metro',
        },
        {
          id: 'flinks_trans_002',
          account_id: savedAccounts[0]?.id || '',
          description: 'Tim Hortons',
          amount: -12.50,
          date: '2024-01-22',
          merchant: 'Tim Hortons',
        },
        {
          id: 'flinks_trans_003',
          account_id: savedAccounts[0]?.id || '',
          description: 'TTC Subway',
          amount: -3.35,
          date: '2024-01-21',
          merchant: 'TTC',
        },
      ];

      const transformedTransactions = mockTransactions.map(transaction => ({
        account_id: transaction.account_id,
        external_transaction_id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        merchant: transaction.merchant,
        category_name: undefined,
        is_manual_category: false,
      })).filter(t => t.account_id);

      await saveTransactions(transformedTransactions);

      toast({
        title: "Accounts Updated",
        description: `Successfully loaded ${savedAccounts.length} accounts and ${transformedTransactions.length} transactions.`,
      });
    } catch (error) {
      console.error('Error fetching Flinks data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch account data from Flinks.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlinksSuccess = (loginId: string) => {
    localStorage.setItem('flinks_login_id', loginId);
    setFlinksLoginId(loginId);
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
    fetchFlinksData,
    handleFlinksSuccess,
    categorizeTransactions,
  };
};
