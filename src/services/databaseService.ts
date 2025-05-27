
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DatabaseAccount {
  id: string;
  external_account_id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  provider: 'plaid' | 'flinks';
  connected_at: string;
  last_synced_at: string;
  is_active: boolean;
}

export interface DatabaseTransaction {
  id: string;
  account_id: string;
  external_transaction_id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category_name?: string;
  is_manual_category: boolean;
}

export interface DatabaseCategory {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

class DatabaseService {
  // Account operations
  async getAccounts(): Promise<DatabaseAccount[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    return data || [];
  }

  async saveAccount(account: Omit<DatabaseAccount, 'id'>): Promise<DatabaseAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('accounts')
      .upsert({
        ...account,
        user_id: user.id,
      }, {
        onConflict: 'external_account_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving account:', error);
      throw error;
    }

    return data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', accountId);

    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Transaction operations
  async getTransactions(accountId?: string): Promise<DatabaseTransaction[]> {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(id, bank_name, is_active)
      `)
      .order('date', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Only get transactions from active accounts
    query = query.eq('accounts.is_active', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return data || [];
  }

  async saveTransactions(transactions: Omit<DatabaseTransaction, 'id'>[]): Promise<DatabaseTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const transactionsWithUserId = transactions.map(t => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .upsert(transactionsWithUserId, {
        onConflict: 'external_transaction_id,account_id'
      })
      .select();

    if (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }

    return data || [];
  }

  async updateTransactionCategory(transactionId: string, categoryName: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({
        category_name: categoryName,
        is_manual_category: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (error) {
      console.error('Error updating transaction category:', error);
      throw error;
    }
  }

  // Category operations
  async getCategories(): Promise<DatabaseCategory[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  }

  async saveCategory(category: Omit<DatabaseCategory, 'id'>): Promise<DatabaseCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        user_id: user.id,
        is_default: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving category:', error);
      throw error;
    }

    return data;
  }

  // User preferences
  async getUserPreferences() {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user preferences:', error);
      throw error;
    }

    return data;
  }

  async saveUserPreferences(preferences: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        ...preferences,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }

    return data;
  }
}

export const databaseService = new DatabaseService();
