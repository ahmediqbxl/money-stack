
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  spent: number;
  color: string;
}

const BudgetSettings = () => {
  const { toast } = useToast();
  
  // Initial budget data (this would eventually come from a backend)
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: '1', name: 'Food & Dining', budget: 800, spent: 850, color: '#FF6B6B' },
    { id: '2', name: 'Transportation', budget: 400, spent: 420, color: '#4ECDC4' },
    { id: '3', name: 'Shopping', budget: 500, spent: 680, color: '#45B7D1' },
    { id: '4', name: 'Entertainment', budget: 300, spent: 320, color: '#96CEB4' },
    { id: '5', name: 'Bills & Utilities', budget: 600, spent: 580, color: '#FFEAA7' },
    { id: '6', name: 'Healthcare', budget: 200, spent: 250, color: '#DDA0DD' },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEditBudget = (id: string, currentBudget: number) => {
    setEditingId(id);
    setEditValue(currentBudget.toString());
  };

  const handleSaveBudget = (id: string) => {
    const newBudget = parseFloat(editValue);
    if (isNaN(newBudget) || newBudget <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }

    setBudgets(budgets.map(budget => 
      budget.id === id ? { ...budget, budget: newBudget } : budget
    ));

    setEditingId(null);
    setEditValue('');

    toast({
      title: "Budget Updated",
      description: "Your budget has been successfully updated.",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.budget, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-blue-100">Monthly budget set</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <p className="text-xs text-green-100">This month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((totalSpent / totalBudget) * 100)}%</div>
            <p className="text-xs text-purple-100">Of budget used</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>
            Set and manage your monthly spending budgets for each category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.budget) * 100;
            const isOverBudget = budget.spent > budget.budget;
            
            return (
              <div key={budget.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: budget.color }}
                    ></div>
                    <div>
                      <p className="font-medium">{budget.name}</p>
                      <p className="text-sm text-gray-500">
                        ${budget.spent.toLocaleString()} spent of ${budget.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isOverBudget && (
                      <Badge variant="destructive" className="flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Over budget</span>
                      </Badge>
                    )}
                    
                    {editingId === budget.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 h-8"
                          placeholder="Budget"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveBudget(budget.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditBudget(budget.id, budget.budget)}
                      >
                        Edit Budget
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{percentage.toFixed(1)}% used</span>
                    {isOverBudget && (
                      <span className="text-red-500">
                        ${(budget.spent - budget.budget).toLocaleString()} over
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common budget management actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 text-left">
              <div>
                <p className="font-medium">Add New Category</p>
                <p className="text-sm text-gray-500">Create a budget for a new spending category</p>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 text-left">
              <div>
                <p className="font-medium">Reset All Budgets</p>
                <p className="text-sm text-gray-500">Start fresh with new monthly budgets</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetSettings;
