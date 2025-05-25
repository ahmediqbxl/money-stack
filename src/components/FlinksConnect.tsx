
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';

const FlinksConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectBank = () => {
    setIsConnecting(true);
    // Show the Flinks iframe
    const iframe = document.querySelector('.flinksconnect') as HTMLIFrameElement;
    if (iframe) {
      iframe.style.display = 'block';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.zIndex = '9999';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = 'white';
    }
  };

  const handleCloseConnect = () => {
    setIsConnecting(false);
    // Hide the Flinks iframe
    const iframe = document.querySelector('.flinksconnect') as HTMLIFrameElement;
    if (iframe) {
      iframe.style.display = 'none';
    }
  };

  useEffect(() => {
    // Listen for messages from Flinks
    const handleFlinksMessage = (event: MessageEvent) => {
      console.log('Flinks Connect Event:', event.data);
      
      // Handle different Flinks events
      if (event.data.type === 'close' || event.data.type === 'success') {
        handleCloseConnect();
      }
      
      if (event.data.type === 'success') {
        // Handle successful bank connection
        console.log('Bank connected successfully:', event.data);
        // Here you would typically save the connection data to your database
      }
    };

    window.addEventListener('message', handleFlinksMessage);
    
    return () => {
      window.removeEventListener('message', handleFlinksMessage);
    };
  }, []);

  return (
    <>
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your Canadian bank account to automatically import transactions and get personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={handleConnectBank}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            Connect Bank Account
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Powered by Flinks - Bank-level security for Canadian financial institutions
          </p>
        </CardContent>
      </Card>

      {/* Close button overlay when connecting */}
      {isConnecting && (
        <Button
          onClick={handleCloseConnect}
          className="fixed top-4 right-4 z-[10000] bg-gray-800 hover:bg-gray-900 text-white rounded-full p-2"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </>
  );
};

export default FlinksConnect;
