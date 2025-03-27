"use client";

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react'; // Import next-auth hooks
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, LineChart, Baby, Clock, LogIn, LogOut } from 'lucide-react'; // Import icons
import Link from 'next/link';
import { ChildSelector } from '@/components/child-selector';
import { ChildMetrics } from '@/components/child-metrics';

export default function Home() {
  const { data: session, status } = useSession(); // Get session status
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Daycare Analytics</h1>
            <div className="flex items-center gap-4"> {/* Container for selector and auth */}
              {status === 'authenticated' && <ChildSelector onSelect={setSelectedChildId} />}
              {/* Auth Buttons */}
              {status === 'loading' && <Button variant="ghost" disabled>Loading...</Button>}
              {status === 'unauthenticated' && (
                <Button onClick={() => signIn('google')}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
                </Button>
              )}
              {status === 'authenticated' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">{session.user?.email}</span>
                  <Button variant="outline" onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Only show child metrics and main content if authenticated */}
        {status === 'authenticated' && selectedChildId && (
          <div className="mb-12">
            <ChildMetrics childId={selectedChildId} />
          </div>
        )}

        {status === 'authenticated' && (
          <> {/* Wrap main content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Cards remain the same */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="h-5 w-5 text-blue-500" />
                    Daily Reports
                  </CardTitle>
                  <CardDescription>Track daily activities and incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/reports">View Reports</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-green-500" />
                    Analytics
                  </CardTitle>
                  <CardDescription>Analyze trends and patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/analytics">View Analytics</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-purple-500" />
                    Calendar
                  </CardTitle>
                  <CardDescription>View upcoming events and closures</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/calendar">View Calendar</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest updates and events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">No recent activity to display.</p>
                    {/* TODO: Fetch and display recent activity */}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Show a message if not authenticated */}
        {status === 'unauthenticated' && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Daycare Analytics</h2>
            <p className="text-gray-600 mb-6">Please sign in with your Google account to view your child's data.</p>
            <Button onClick={() => signIn('google')}>
              <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
