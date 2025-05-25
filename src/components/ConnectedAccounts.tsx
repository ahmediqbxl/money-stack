
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FlinksConnect from './FlinksConnect';

interface ConnectedAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  connected_at: string;
}

const ConnectedAccounts = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConnectNew, setShowConnectNew] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockAccounts: ConnectedAccount[] = [
      {
        id: '1',
        bank_name: 'TD Bank',
        account_type: 'Checking',
        account_number: '****1234',
        balance: 2450.67,
        currency: 'CAD',
        connected_at: '2024-05-20'
      },
      {
        id: '2',
        bank_name: 'RBC',
        account_type: 'Savings',
        account_number: '****5678',
        balance: 8920.32,
        currency: 'CAD',
        connected_at: '2024-05-22'
      }
    ];
    setAccounts(mockAccounts);
  }, []);

  const handleRefreshAccounts = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch fresh data from Flinks
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Accounts Refreshed",
        description: "Account balances and transactions have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh account data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      setAccounts(accounts.filter(acc => acc.id !== accountId));
      toast({
        title: "Account Removed",
        description: "Bank account has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove account.",
        variant: "destructive",
      });
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  if (showConnectNew) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Connect New Account</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConnectNew(false)}
          >
            Back to Accounts
          </Button>
        </div>
        <FlinksConnect />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Connected Accounts</h3>
          <p className="text-sm text-gray-600">
            Total Balance: <span className="font-semibold text-green-600">${totalBalance.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAccounts}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowConnectNew(true)}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.bank_name}</CardTitle>
                    <CardDescription>
                      {account.account_type} • {account.account_number}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAccount(account.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Connected</p>
                  <p className="text-sm font-medium">{account.connected_at}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Accounts</h3>
            <p className="text-gray-500 mb-4">
              Connect your first bank account to start tracking your finances
            </p>
            <Button
              onClick={() => setShowConnectNew(true)}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConnectedAccounts;
