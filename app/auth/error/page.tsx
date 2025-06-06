'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import logger from '@/lib/logger';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const errorDescription = getErrorDescription(error);

  // Log error for debugging
  useEffect(() => {
    if (error) {
      logger.error({ err: error }, 'Authentication error');
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="p-4 bg-red-50 rounded-md border border-red-200">
              <p className="text-red-800 font-medium">{errorDescription.title}</p>
              <p className="text-red-600 mt-1 text-sm">{errorDescription.message}</p>
              {error && (
                <p className="text-red-500 mt-2 text-xs font-mono">Error code: {error}</p>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button asChild>
                <Link href="/auth/signin">
                  Try Again
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  Return to Home
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getErrorDescription(error: string | null) {
  switch (error) {
    case 'Configuration':
      return {
        title: 'Server Error',
        message: 'There is a problem with the server configuration. Please contact support.'
      };
    case 'AccessDenied':
      return {
        title: 'Access Denied',
        message: 'You do not have permission to sign in.'
      };
    case 'Verification':
      return {
        title: 'Verification Failed',
        message: 'The verification link may have expired or already been used.'
      };
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'EmailCreateAccount':
    case 'Callback':
    case 'OAuthAccountNotLinked':
    case 'EmailSignin':
    case 'CredentialsSignin':
      return {
        title: 'Sign In Error',
        message: 'There was a problem with your sign in attempt. Please try again.'
      };
    case 'SessionRequired':
      return {
        title: 'Authentication Required',
        message: 'You must be signed in to access this page.'
      };
    default:
      return {
        title: 'Authentication Error',
        message: 'An unexpected error occurred during authentication. Please try again.'
      };
  }
}
