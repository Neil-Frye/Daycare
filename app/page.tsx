"use client";

import React, { useState, useEffect } from 'react'; // Import useEffect
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, LineChart, Baby, Clock, LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ChildSelector } from '@/components/child-selector';
import { ChildMetrics } from '@/components/child-metrics';
import { ErrorBoundary } from '@/components/error-boundary';
import supabaseClient from '@/lib/supabase/client'; // Import client supabase
import { type Database, type Tables } from '@/lib/supabase/types'; // Import types

// Define Child type
type Child = Tables<'children'>;

export default function Home() {
  const { data: session, status } = useSession();
  const [children, setChildren] = useState<Child[]>([]); // State for children list
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null); // State for selected child ID (allow null)
  const [isLoadingChildren, setIsLoadingChildren] = useState(true); // Loading state

  // Fetch children when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchChildren = async () => {
        setIsLoadingChildren(true);
        const { data, error } = await supabaseClient
          .from('children')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching children:', error);
          setChildren([]); // Set empty array on error
        } else {
          setChildren(data || []);
          // Automatically select the first child if available and none is selected
          if (data && data.length > 0 && !selectedChildId) {
            setSelectedChildId(data[0].id);
          } else if (data && data.length === 0) {
            setSelectedChildId(null); // No children, no selection
          }
        }
        setIsLoadingChildren(false);
      };
      fetchChildren();
    } else {
      // Reset state if not authenticated
      setChildren([]);
      setSelectedChildId(null);
      setIsLoadingChildren(false);
    }
  }, [status, selectedChildId]); // Re-fetch if auth status changes

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Daycare Analytics</h1>
            <div className="flex items-center gap-4">
              {status === 'authenticated' && (
                <ErrorBoundary
                  fallback={
                    <div className="w-[200px] h-10 bg-red-50 border border-red-200 rounded-md flex items-center justify-center text-red-500 text-sm">
                      Error loading selector
                    </div>
                  }
                >
                  {isLoadingChildren ? (
                     <div className="w-[200px] h-10 bg-gray-100 rounded-md animate-pulse flex items-center justify-center">
                       <span className="text-xs text-gray-500">Loading...</span>
                     </div>
                  ) : (
                    <ChildSelector
                      children={children} // Pass fetched children
                      selectedChildId={selectedChildId} // Pass selected ID state
                      onChildChange={handleChildChange} // Pass handler function
                    />
                  )}
                </ErrorBoundary>
              )}
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
            {/* Ensure ChildMetrics can handle potential null childId if needed, though logic above tries to select one */}
            <ChildMetrics childId={selectedChildId} />
          </div>
        )}

        {status === 'authenticated' ? (
          <>
            {children.length === 0 && !isLoadingChildren && (
                 <Card className="mb-6 bg-yellow-50 border-yellow-200">
                   <CardHeader>
                     <CardTitle className="text-yellow-700">No Children Found</CardTitle>
                     <CardDescription className="text-yellow-600">
                       Please add a child to start tracking analytics and logs.
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <Button asChild>
                       <Link href="/children/add">Add Your First Child</Link>
                     </Button>
                   </CardContent>
                 </Card>
            )}
            {children.length > 0 && !selectedChildId && !isLoadingChildren && (
                 <Card className="mb-6 bg-blue-50 border-blue-200">
                   <CardHeader>
                     <CardTitle className="text-blue-700">Select a Child</CardTitle>
                     <CardDescription className="text-blue-600">
                       Please select a child from the dropdown above to view their details.
                     </CardDescription>
                   </CardHeader>
                 </Card>
            )}

            {/* Hide main cards if no child is selected */}
            {selectedChildId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Baby className="h-5 w-5 text-pink-500" />
                        Manage Children
                      </CardTitle>
                      <CardDescription>Add or update child information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link href="/children/add" passHref>
                          Add Child
                        </Link>
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
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Daycare Analytics</h2>
            <p className="text-gray-600 mb-6">Please sign in with your Google account to view your child's data.</p>
            <Button onClick={() => signIn('google')}>
              <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
            </Button>
            <div className="mt-8">
              <p className="text-gray-500 mb-2">For testing purposes:</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/test">Test Page</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
