
import { useState, useEffect } from 'react';
import { flinksService } from '@/services/flinksService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [accounts, setAccounts] = useState<FlinksAccount[]>([]);
  const [transactions, setTransactions] = useState<FlinksTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [flinksLoginId, setFlinksLoginId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load stored Flinks login ID from localStorage
  useEffect(() => {
    const storedLoginId = localStorage.getItem('flinks_login_id');
    if (storedLoginId) {
      setFlinksLoginId(storedLoginId);
    }
  }, []);

  // Fetch data when login ID is available
  useEffect(() => {
    if (flinksLoginId) {
      fetchFlinksData();
    }
  }, [flinksLoginId]);

  const fetchFlinksData = async () => {
    if (!flinksLoginId) return;
    
    setIsLoading(true);
    try {
      const data = await flinksService.getAccountsAndTransactions(flinksLoginId);
      
      // Transform Flinks accounts to our format
      const transformedAccounts: FlinksAccount[] = data.accounts.map(account => ({
        id: account.id,
        bank_name: account.institution.name,
        account_type: account.type,
        account_number: `****${account.number.slice(-4)}`,
        balance: account.balance.current,
        currency: account.currency,
        connected_at: new Date().toISOString().split('T')[0],
      }));

      setAccounts(transformedAccounts);
      setTransactions(data.transactions);

      toast({
        title: "Accounts Updated",
        description: `Successfully loaded ${transformedAccounts.length} accounts and ${data.transactions.length} transactions.`,
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
    fetchFlinksData,
    handleFlinksSuccess,
    categorizeTransactions,
  };
};
