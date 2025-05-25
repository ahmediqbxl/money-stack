
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  merchant: string;
  date: string;
  category?: string;
}

interface CategoryInsight {
  category: string;
  total: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

const AITransactionAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<CategoryInsight[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const { toast } = useToast();

  // Sample transactions for demonstration
  const sampleTransactions: Transaction[] = [
    { id: '1', description: 'Metro Grocery Store', amount: -67.43, merchant: 'Metro', date: '2024-05-23' },
    { id: '2', description: 'Uber Trip Downtown', amount: -23.50, merchant: 'Uber', date: '2024-05-22' },
    { id: '3', description: 'Netflix Subscription', amount: -15.99, merchant: 'Netflix', date: '2024-05-22' },
    { id: '4', description: 'Shell Gas Station', amount: -45.67, merchant: 'Shell', date: '2024-05-21' },
    { id: '5', description: 'Shoppers Drug Mart', amount: -34.21, merchant: 'Shoppers', date: '2024-05-20' },
    { id: '6', description: 'Tim Hortons Coffee', amount: -5.67, merchant: 'Tim Hortons', date: '2024-05-20' },
    { id: '7', description: 'Amazon Purchase', amount: -89.99, merchant: 'Amazon', date: '2024-05-19' },
    { id: '8', description: 'Hydro Ottawa Bill', amount: -120.45, merchant: 'Hydro Ottawa', date: '2024-05-18' },
  ];

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: sampleTransactions }
      });

      if (error) throw error;

      const categorizedTransactions = data.categorizedTransactions;
      
      // Generate insights from categorized data
      const categoryTotals: { [key: string]: { total: number; count: number } } = {};
      
      categorizedTransactions.forEach((transaction: Transaction & { category: string }) => {
        const category = transaction.category;
        if (!categoryTotals[category]) {
          categoryTotals[category] = { total: 0, count: 0 };
        }
        categoryTotals[category].total += Math.abs(transaction.amount);
        categoryTotals[category].count += 1;
      });

      const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0);
      
      const categoryInsights: CategoryInsight[] = Object.entries(categoryTotals).map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: (data.total / totalSpent) * 100,
        trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down' // Mock trend data
      })).sort((a, b) => b.total - a.total);

      setInsights(categoryInsights);
      setLastAnalyzed(new Date().toISOString());
      
      toast({
        title: "Analysis Complete",
        description: `Categorized ${categorizedTransactions.length} transactions using AI`,
      });

    } catch (error) {
      console.error('AI Analysis Error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-red-500" />
    ) : (
      <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>AI Transaction Analysis</CardTitle>
                <CardDescription>
                  Powered by GPT - Automatically categorize and analyze your spending patterns
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {lastAnalyzed && (
          <CardContent>
            <p className="text-sm text-gray-600">
              Last analyzed: {new Date(lastAnalyzed).toLocaleString()}
            </p>
          </CardContent>
        )}
      </Card>

      {insights.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Spending Categories</CardTitle>
            <CardDescription>AI-generated insights from your transaction data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{insight.category}</Badge>
                    <div>
                      <p className="font-medium">${insight.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{insight.count} transactions</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium">{insight.percentage.toFixed(1)}%</p>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(insight.trend)}
                        <span className="text-sm text-gray-500">
                          {insight.trend === 'up' ? 'Increased' : 'Decreased'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Yet</h3>
            <p className="text-gray-500 mb-4">
              Run AI analysis to automatically categorize your transactions and get insights
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AITransactionAnalysis;
