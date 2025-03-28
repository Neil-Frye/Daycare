'use client';

import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AuthTestPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Auth Test Page</h1>
        <p className="text-gray-600 mt-2">Testing NextAuth.js Authentication</p>
      </header>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>Current status of your authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-md">
            <p><strong>Status:</strong> {status}</p>
            {session && (
              <>
                <p className="mt-2"><strong>User:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {status === 'unauthenticated' && (
              <Button onClick={() => signIn('google')}>
                <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
