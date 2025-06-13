
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  category_name: string;
  budget_amount: number;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load budgets from localStorage as fallback and database
  useEffect(() => {
    if (user) {
      loadBudgets();
    }
  }, [user]);

  const loadBudgets = async () => {
    if (!user) return;
    
    try {
      // For now, use localStorage to maintain compatibility
      const storedBudgets = localStorage.getItem(`budgets_${user.id}`);
      if (storedBudgets) {
        setBudgets(JSON.parse(storedBudgets));
      } else {
        // Initialize with default budgets if none exist
        const defaultBudgets = [
          { id: '1', category_name: 'Food & Dining', budget_amount: 800, color: '#FF6B6B' },
          { id: '2', category_name: 'Transportation', budget_amount: 400, color: '#4ECDC4' },
          { id: '3', category_name: 'Shopping', budget_amount: 500, color: '#45B7D1' },
          { id: '4', category_name: 'Entertainment', budget_amount: 300, color: '#96CEB4' },
          { id: '5', category_name: 'Bills & Utilities', budget_amount: 600, color: '#FFEAA7' },
          { id: '6', category_name: 'Healthcare', budget_amount: 200, color: '#DDA0DD' },
        ].map(b => ({
          ...b,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setBudgets(defaultBudgets);
        localStorage.setItem(`budgets_${user.id}`, JSON.stringify(defaultBudgets));
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const saveBudgets = (newBudgets: Budget[]) => {
    if (!user) return;
    
    setBudgets(newBudgets);
    localStorage.setItem(`budgets_${user.id}`, JSON.stringify(newBudgets));
  };

  const updateBudget = (budgetId: string, newAmount: number) => {
    const updatedBudgets = budgets.map(budget => 
      budget.id === budgetId 
        ? { ...budget, budget_amount: newAmount, updated_at: new Date().toISOString() }
        : budget
    );
    saveBudgets(updatedBudgets);
  };

  const addBudget = (categoryName: string, amount: number) => {
    if (!user) return;
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newBudget: Budget = {
      id: Date.now().toString(),
      category_name: categoryName,
      budget_amount: amount,
      color: randomColor,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedBudgets = [...budgets, newBudget];
    saveBudgets(updatedBudgets);
    return newBudget;
  };

  const getBudgetForCategory = (categoryName: string): number => {
    const budget = budgets.find(b => b.category_name.toLowerCase() === categoryName.toLowerCase());
    return budget?.budget_amount || 0;
  };

  return {
    budgets,
    isLoading,
    updateBudget,
    addBudget,
    getBudgetForCategory,
    saveBudgets
  };
};
