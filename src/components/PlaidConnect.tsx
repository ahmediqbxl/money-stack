import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X, AlertCircle } from 'lucide-react';
import { plaidService } from '@/services/plaidService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PlaidConnectProps {
  onSuccess?: (accessToken: string) => void;
}

declare global {
  interface Window {
    Plaid: {
      create: (config: any) => {
        open: () => void;
        destroy: () => void;
      };
    };
  }
}

const PlaidConnect = ({ onSuccess }: PlaidConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPlaidLoaded, setIsPlaidLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if Plaid SDK is loaded
  useEffect(() => {
    const checkPlaidLoaded = () => {
      if (window.Plaid) {
        setIsPlaidLoaded(true);
      } else {
        // Keep checking until Plaid is loaded
        setTimeout(checkPlaidLoaded, 100);
      }
    };
    
    checkPlaidLoaded();
  }, []);

  const handleConnectBank = async () => {
    if (!linkToken || !isPlaidLoaded) {
      console.log('Cannot connect: missing link token or Plaid not loaded');
      return;
    }

    setIsConnecting(true);
    setError(null);
    
    try {
      // Use real Plaid Link
      const linkHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (public_token: string, metadata: any) => {
          console.log('Plaid Link success:', { public_token, metadata });
          
          try {
            const accessToken = await plaidService.exchangePublicToken(public_token);
            console.log('Exchanged for access token:', accessToken);
            
            if (onSuccess) {
              onSuccess(accessToken);
            }
            
            toast({
              title: "Success!",
              description: "Bank account connected successfully via Plaid.",
            });
          } catch (error) {
            console.error('Error exchanging token:', error);
            setError(`Failed to exchange token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            toast({
              title: "Error",
              description: "Failed to complete bank connection.",
              variant: "destructive",
            });
          }
          
          setIsConnecting(false);
        },
        onExit: (err: any, metadata: any) => {
          console.log('Plaid Link exit:', { err, metadata });
          if (err) {
            setError(`Plaid Link error: ${err.error_message || 'Unknown error'}`);
          }
          setIsConnecting(false);
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', { eventName, metadata });
        },
      });

      linkHandler.open();
      
    } catch (error) {
      console.error('Error connecting to Plaid:', error);
      setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const handleCloseConnect = () => {
    setIsConnecting(false);
    setError(null);
  };

  // Create link token on component mount
  useEffect(() => {
    const createLinkToken = async () => {
      if (user) {
        try {
          setError(null);
          const token = await plaidService.createLinkToken(user.id);
          setLinkToken(token);
          console.log('Created link token:', token);
        } catch (error) {
          console.error('Error creating link token:', error);
          setError(`Failed to initialize Plaid: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    createLinkToken();
  }, [user]);

  const canConnect = linkToken && isPlaidLoaded && !error;

  return (
    <>
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your bank account using Plaid to automatically import transactions and get personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleConnectBank}
            disabled={isConnecting || !canConnect}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
          </Button>
          
          <p className="text-sm text-gray-500 mt-2">
            {!isPlaidLoaded 
              ? 'Loading Plaid SDK...'
              : error
                ? 'Please check configuration and try again'
                : isConnecting 
                  ? 'Connecting via Plaid...' 
                  : 'Powered by Plaid - Real sandbox environment'
            }
          </p>
          
          {!error && (
            <p className="text-xs text-gray-400 mt-2">
              Use credentials: user_good / pass_good for testing
            </p>
          )}
        </CardContent>
      </Card>

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle>Connecting via Plaid</CardTitle>
              <CardDescription>
                Please complete the connection in the Plaid Link window...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <Button
                onClick={handleCloseConnect}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PlaidConnect;
