import { useState, useEffect } from 'react';
import { databaseService, DatabaseAccount, DatabaseTransaction, DatabaseCategory } from '@/services/databaseService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useDatabase = () => {
  const [accounts, setAccounts] = useState<DatabaseAccount[]>([]);
  const [transactions, setTransactions] = useState<DatabaseTransaction[]>([]);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      // Clear data when user logs out
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
    }
  }, [user]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [accountsData, transactionsData, categoriesData] = await Promise.all([
        databaseService.getAccounts(),
        databaseService.getTransactions(),
        databaseService.getCategories()
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAccount = async (account: Omit<DatabaseAccount, 'id'>) => {
    try {
      // Check if account already exists
      const existingAccount = accounts.find(a => a.external_account_id === account.external_account_id);
      
      if (existingAccount) {
        console.log('Account already exists:', existingAccount);
        return existingAccount;
      }

      const savedAccount = await databaseService.saveAccount(account);
      setAccounts(prev => [...prev, savedAccount]);
      return savedAccount;
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Error",
        description: "Failed to save account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const saveTransactions = async (newTransactions: Omit<DatabaseTransaction, 'id'>[]) => {
    try {
      const savedTransactions = await databaseService.saveTransactions(newTransactions);
      setTransactions(prev => {
        const updatedTransactions = [...prev];
        savedTransactions.forEach(newTrans => {
          const existingIndex = updatedTransactions.findIndex(
            t => t.external_transaction_id === newTrans.external_transaction_id
          );
          if (existingIndex >= 0) {
            updatedTransactions[existingIndex] = newTrans;
          } else {
            updatedTransactions.push(newTrans);
          }
        });
        return updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      return savedTransactions;
    } catch (error) {
      console.error('Error saving transactions:', error);
      toast({
        title: "Error",
        description: "Failed to save transactions.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTransactionCategory = async (transactionId: string, categoryName: string) => {
    try {
      await databaseService.updateTransactionCategory(transactionId, categoryName);
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? { ...t, category_name: categoryName, is_manual_category: true }
            : t
        )
      );
      toast({
        title: "Category Updated",
        description: `Transaction categorized as ${categoryName}`,
      });
    } catch (error) {
      console.error('Error updating transaction category:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction category.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      await databaseService.deleteAccount(accountId);
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setTransactions(prev => prev.filter(t => t.account_id !== accountId));
      toast({
        title: "Account Removed",
        description: "Bank account has been disconnected.",
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to remove account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    accounts,
    transactions,
    categories,
    isLoading,
    loadAllData,
    saveAccount,
    saveTransactions,
    updateTransactionCategory,
    deleteAccount,
  };
};
