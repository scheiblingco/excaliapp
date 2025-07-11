import { Palette, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

interface LoginPageProps {
  doAuth: () => void;
  doGuestAuth: () => void;
}

export function LoginPage({ doAuth, doGuestAuth }: LoginPageProps) {
  // Uncomment to enable "test API" button on login page for troubleshooting
  // const [apiResponse, setApiResponse] = useState<string>('Not tested yet');
  
  // const testRequest = async () => {
  //   try {
  //     const response = await fetch('/api/testing', {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //     const data = await response.json();
  //     setApiResponse(data.message || 'No message returned');
  //   } catch (error) {
  //     setApiResponse('Error testing API');
  //     console.error('API Test Error:', error);
  //   }
  // };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {/* <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center shadow-creative"> */}
              <img src="/logo.svg" alt="excaliapp Logo" className="w-64 h-64 mb-5" />
            {/* </div> */}
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Create, save, and share beautiful drawings and save them securely in the cloud or locally in your browser.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-card border-border shadow-creative">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl text-center">Sign in to continue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {import.meta.env.MODE !== "browser" ? <Button
              variant="outline"
              className="w-full h-12 text-center justify-start gap-3 hover:bg-accent transition-creative"
              onClick={() => doAuth()}
            >
              <Lock className="w-5 h-5" />
              <span className="flex-1">Continue with {import.meta.env.VITE_OIDC_LABEL || "OpenID Connect"}</span>
            </Button> : (<Button
              variant="outline"
              className="w-full h-12 text-center justify-start gap-3 hover:bg-accent transition-creative"
              onClick={() => doGuestAuth()}
            >
                <Lock className="w-5 h-5" />
                <span className="flex-1">Continue as Guest (demo mode, local storage)</span>
            </Button>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}