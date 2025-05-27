import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, CreditCard, PiggyBank, AlertTriangle, Lightbulb, Target, LogOut, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import FlinksConnect from "@/components/FlinksConnect";
import ConnectedAccounts from "@/components/ConnectedAccounts";
import AITransactionAnalysis from "@/components/AITransactionAnalysis";
import TransactionManager from "@/components/TransactionManager";
import BudgetSettings from "@/components/BudgetSettings";

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Sample data for demo purposes
  const monthlySpending = [
    { month: 'Jan', amount: 3200, budget: 3000 },
    { month: 'Feb', amount: 2800, budget: 3000 },
    { month: 'Mar', amount: 3400, budget: 3000 },
    { month: 'Apr', amount: 2900, budget: 3000 },
    { month: 'May', amount: 3600, budget: 3000 },
    { month: 'Jun', amount: 3100, budget: 3000 },
  ];

  const categoryData = [
    { name: 'Food & Dining', value: 850, color: '#FF6B6B', budget: 800 },
    { name: 'Transportation', value: 420, color: '#4ECDC4', budget: 400 },
    { name: 'Shopping', value: 680, color: '#45B7D1', budget: 500 },
    { name: 'Entertainment', value: 320, color: '#96CEB4', budget: 300 },
    { name: 'Bills & Utilities', value: 580, color: '#FFEAA7', budget: 600 },
    { name: 'Healthcare', value: 250, color: '#DDA0DD', budget: 200 },
  ];

  const recentTransactions = [
    { id: 1, merchant: 'Whole Foods', amount: -67.43, category: 'Food & Dining', date: '2024-05-23', type: 'debit' },
    { id: 2, merchant: 'Uber', amount: -23.50, category: 'Transportation', date: '2024-05-22', type: 'credit' },
    { id: 3, merchant: 'Netflix', amount: -15.99, category: 'Entertainment', date: '2024-05-22', type: 'debit' },
    { id: 4, merchant: 'Target', amount: -89.24, category: 'Shopping', date: '2024-05-21', type: 'debit' },
    { id: 5, merchant: 'Salary Deposit', amount: 4200.00, category: 'Income', date: '2024-05-20', type: 'deposit' },
  ];

  const aiInsights = [
    {
      type: 'savings',
      title: 'Coffee Shop Optimization',
      description: 'You spend $127/month on coffee. Making coffee at home 3 days a week could save you $45/month.',
      potential: 540,
      difficulty: 'Easy'
    },
    {
      type: 'budget',
      title: 'Shopping Budget Exceeded',
      description: 'Your shopping spending is 36% over budget. Consider setting spending alerts.',
      potential: 180,
      difficulty: 'Medium'
    },
    {
      type: 'investment',
      title: 'Emergency Fund Goal',
      description: 'You have $2,400 in checking. Consider moving $1,000 to a high-yield savings account.',
      potential: 48,
      difficulty: 'Easy'
    }
  ];

  const handleConnectBank = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Demo Mode",
        description: "This is a demo. To connect real banks, you'll need to integrate with services like Plaid through our Supabase backend integration.",
      });
    }, 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You've been successfully signed out.",
    });
  };

  const totalSpent = categoryData.reduce((sum, cat) => sum + cat.value, 0);
  const totalBudget = categoryData.reduce((sum, cat) => sum + cat.budget, 0);
  const potentialSavings = aiInsights.reduce((sum, insight) => sum + insight.potential, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header with user info */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1 space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight py-2">
              MoneySpread
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect your accounts and let AI analyze your spending to find personalized savings opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Connected Accounts Section */}
        <div className="max-w-4xl mx-auto">
          <ConnectedAccounts />
        </div>

        {/* AI Analysis Section */}
        <div className="max-w-4xl mx-auto">
          <AITransactionAnalysis />
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
              <p className="text-xs text-blue-100">
                ${totalBudget - totalSpent > 0 ? '+' : ''}${(totalBudget - totalSpent).toLocaleString()} vs budget
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <PiggyBank className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${potentialSavings}/month</div>
              <p className="text-xs text-green-100">
                AI identified opportunities
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
              <Target className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((totalSpent / totalBudget) * 100)}%</div>
              <p className="text-xs text-purple-100">
                of monthly budget used
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Connected</CardTitle>
              <CreditCard className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-orange-100">
                2 checking, 1 credit card
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending by Category */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Current month breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {categoryData.map((category, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm text-gray-600">{category.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Budget Progress */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>How you're tracking this month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{category.name}</span>
                        <span className="text-gray-500">
                          ${category.value} / ${category.budget}
                        </span>
                      </div>
                      <Progress 
                        value={(category.value / category.budget) * 100} 
                        className="h-2"
                      />
                      {category.value > category.budget && (
                        <p className="text-xs text-red-500 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Over budget by ${category.value - category.budget}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionManager />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetSettings />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    AI-Powered Savings Insights
                  </CardTitle>
                  <CardDescription>
                    Personalized recommendations based on your spending patterns
                  </CardDescription>
                </CardHeader>
              </Card>

              {aiInsights.map((insight, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <CardDescription>{insight.description}</CardDescription>
                      </div>
                      <Badge variant={insight.difficulty === 'Easy' ? 'default' : 'secondary'}>
                        {insight.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold text-green-600">
                        +${insight.potential}/year
                      </div>
                      <Button variant="outline" size="sm">
                        Apply Suggestion
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Monthly Spending Trends</CardTitle>
                  <CardDescription>6-month spending vs budget overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySpending}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, '']} />
                        <Bar dataKey="amount" fill="#3B82F6" name="Actual" />
                        <Bar dataKey="budget" fill="#E5E7EB" name="Budget" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Spending Pattern</CardTitle>
                  <CardDescription>Daily spending over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySpending}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
