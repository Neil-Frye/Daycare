'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function SignIn() {
  // Auto-redirect to Google sign-in
  useEffect(() => {
    // Optional: You can auto-redirect to Google sign-in
    // signIn('google');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to Daycare Analytics</CardTitle>
          <CardDescription>
            Connect with your Google account to access your child's daycare data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button 
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full"
              size="lg"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
            <p className="text-center text-sm text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
