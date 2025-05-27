
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';
import { plaidService } from '@/services/plaidService';
import { useAuth } from '@/contexts/AuthContext';

interface PlaidConnectProps {
  onSuccess?: (accessToken: string) => void;
}

const PlaidConnect = ({ onSuccess }: PlaidConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { user } = useAuth();

  const handleConnectBank = async () => {
    setIsConnecting(true);
    
    try {
      // For sandbox mode, simulate the flow
      if (!linkToken || linkToken.startsWith('link-sandbox-')) {
        // Simulate Plaid Link flow for sandbox
        setTimeout(async () => {
          const mockPublicToken = `public_sandbox_${Date.now()}`;
          console.log('Mock Plaid connection successful, public token:', mockPublicToken);
          
          // Exchange for access token
          const accessToken = await plaidService.exchangePublicToken(mockPublicToken);
          console.log('Exchanged for access token:', accessToken);
          
          if (onSuccess) {
            onSuccess(accessToken);
          }
          
          setIsConnecting(false);
        }, 2000);
        return;
      }

      // For real Plaid integration, you would load and initialize Plaid Link here
      // This requires the Plaid Link SDK to be loaded
      console.log('Initializing Plaid Link with token:', linkToken);
      
      // Placeholder for real Plaid Link initialization
      // In a real implementation, you would use:
      // const linkHandler = Plaid.create({
      //   token: linkToken,
      //   onSuccess: async (public_token, metadata) => {
      //     const accessToken = await plaidService.exchangePublicToken(public_token);
      //     if (onSuccess) {
      //       onSuccess(accessToken);
      //     }
      //   },
      //   onExit: () => {
      //     setIsConnecting(false);
      //   }
      // });
      // linkHandler.open();
      
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
            disabled={isConnecting || !linkToken}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            {isConnecting 
              ? 'Connecting via Plaid...' 
              : linkToken?.startsWith('link-sandbox-')
                ? 'Sandbox Mode - Demo data will be used'
                : 'Powered by Plaid - Trusted by thousands of financial apps'
            }
          </p>
        </CardContent>
      </Card>

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle>Connecting via Plaid</CardTitle>
              <CardDescription>Please wait while we establish a secure connection...</CardDescription>
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
