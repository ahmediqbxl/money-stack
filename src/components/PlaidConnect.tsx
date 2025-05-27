import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';
import { plaidService } from '@/services/plaidService';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

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
    
    try {
      if (linkToken.startsWith('link-sandbox-')) {
        // Fallback to mock flow if still using sandbox token
        setTimeout(async () => {
          const mockPublicToken = `public_sandbox_${Date.now()}`;
          console.log('Mock Plaid connection successful, public token:', mockPublicToken);
          
          const accessToken = await plaidService.exchangePublicToken(mockPublicToken);
          console.log('Exchanged for access token:', accessToken);
          
          if (onSuccess) {
            onSuccess(accessToken);
          }
          
          setIsConnecting(false);
        }, 2000);
        return;
      }

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
          } catch (error) {
            console.error('Error exchanging token:', error);
          }
          
          setIsConnecting(false);
        },
        onExit: (err: any, metadata: any) => {
          console.log('Plaid Link exit:', { err, metadata });
          setIsConnecting(false);
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', { eventName, metadata });
        },
      });

      linkHandler.open();
      
    } catch (error) {
      console.error('Error connecting to Plaid:', error);
      setIsConnecting(false);
    }
  };

  const handleCloseConnect = () => {
    setIsConnecting(false);
  };

  // Create link token on component mount
  useEffect(() => {
    const createLinkToken = async () => {
      if (user) {
        try {
          const token = await plaidService.createLinkToken(user.id);
          setLinkToken(token);
          console.log('Created link token:', token);
        } catch (error) {
          console.error('Error creating link token:', error);
          // Set a sandbox token as fallback
          setLinkToken(`link-sandbox-${Date.now()}`);
        }
      }
    };

    createLinkToken();
  }, [user]);

  useEffect(() => {
    // Listen for messages from Plaid Link (for real implementation)
    const handlePlaidMessage = (event: MessageEvent) => {
      console.log('Plaid Link Event:', event.data);
      
      if (event.data.type === 'close') {
        handleCloseConnect();
      }
      
      if (event.data.type === 'success') {
        console.log('Bank connected successfully:', event.data);
        
        const publicToken = event.data.public_token || event.data.data?.public_token;
        if (publicToken && onSuccess) {
          // Exchange public token for access token
          plaidService.exchangePublicToken(publicToken).then(accessToken => {
            onSuccess(accessToken);
          }).catch(error => {
            console.error('Error exchanging token:', error);
          });
        }
        
        handleCloseConnect();
      }
    };

    window.addEventListener('message', handlePlaidMessage);
    
    return () => {
      window.removeEventListener('message', handlePlaidMessage);
    };
  }, [onSuccess]);

  const canConnect = linkToken && isPlaidLoaded;
  const isUsingSandbox = linkToken?.startsWith('link-sandbox-');

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
              : isConnecting 
                ? 'Connecting via Plaid...' 
                : isUsingSandbox
                  ? 'Sandbox Mode - Demo data will be used'
                  : 'Powered by Plaid - Ready for sandbox testing'
            }
          </p>
        </CardContent>
      </Card>

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle>Connecting via Plaid</CardTitle>
              <CardDescription>
                {isUsingSandbox 
                  ? 'Please wait while we establish a demo connection...'
                  : 'Please complete the connection in the Plaid Link window...'
                }
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
