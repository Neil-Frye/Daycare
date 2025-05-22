"use client";

import React, { useState, useEffect, memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutGrid, LineChart, BarChart, Bell, User, Settings, LogIn, LogOut, Plus,
  ArrowLeft, MoreVertical, Smile, Utensils, Bed, ToyBrick, CheckCircle, CircleUserRound, Music, MessageSquare, Target, Activity, CalendarDays, Users,
  Baby, Clock // Added missing icons
} from 'lucide-react';
import Link from 'next/link';
import { ChildSelector } from '@/components/child-selector';
import { ErrorBoundary } from '@/components/error-boundary';
import { QuickLogCard } from '@/components/dashboard/quick-log-card';
import { TodaysScheduleCard } from '@/components/dashboard/todays-schedule-card';
import { ChildProgressCard } from '@/components/dashboard/child-progress-card';
import supabaseClient from '@/lib/supabase/client';
import { type Tables } from '@/lib/supabase/types';
import Image from 'next/image'; // Import Image component

// Define Child type
type Child = Tables<'children'>;

// Placeholder components for complex elements
const PlaceholderChart = ({ type = 'line' }: { type?: 'line' | 'bar' }) => (
  <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
    {type === 'line' ? <LineChart className="h-8 w-8" /> : <BarChart className="h-8 w-8" />}
    <span className="ml-2">Chart Placeholder</span>
  </div>
);

const DynamicPlaceholderChart = dynamic(() =>
  Promise.resolve(PlaceholderChart),
  {
    loading: (): JSX.Element => <p role="status" className="text-sm text-gray-500">Loading chart...</p>,
    ssr: false
  }
);

// CircularProgress has been moved to components/ui/circular-progress.tsx
// const CircularProgress = memo(function CircularProgress({ value, label }: { value: string, label: string }) {
//   return (
//     <div className="flex flex-col items-center">
//         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-300 mb-2">
//             <span className="text-green-700 font-semibold text-lg">{value}</span>
//         </div>
//         <span className="text-sm text-gray-600">{label}</span>
//     </div>
//   );
// });
// CircularProgress.displayName = 'CircularProgress';

export default function Home() {
  const { data: session, status } = useSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null); // Store selected child object

  // Effect for fetching children list
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchChildrenList = async () => {
        setIsLoadingChildren(true);
        const { data, error } = await supabaseClient
          .from('children')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching children:', error);
          setChildren([]);
        } else {
          setChildren(data || []);
          // Logic to set initial selectedChildId if none is set or current is invalid
          if (data && data.length > 0) {
            const currentSelectionValid = selectedChildId && data.some(c => c.id === selectedChildId);
            if (!currentSelectionValid) {
              setSelectedChildId(data[0].id);
            }
          } else {
            setSelectedChildId(null);
          }
        }
        setIsLoadingChildren(false);
      };
      fetchChildrenList();
    } else {
      setChildren([]);
      setSelectedChildId(null);
      setIsLoadingChildren(false);
    }
  }, [status]); // Removed selectedChildId from here

  // Effect for updating the selectedChild object
  useEffect(() => {
    if (selectedChildId && children.length > 0) {
      const child = children.find(c => c.id === selectedChildId);
      setSelectedChild(child || null);
    } else {
      setSelectedChild(null);
    }
  }, [selectedChildId, children]); // Runs when selectedChildId or children list changes

  const handleChildChange = useCallback((childId: string) => {
    setSelectedChildId(childId);
    // setSelectedChild(children.find(c => c.id === childId) || null); // This line is removed as the new useEffect handles it.
  }, []); // setSelectedChildId is stable

  // Mock data for display based on the design
  const mockChildPhotoUrl = '/placeholder-child.jpg'; // Replace with actual logic if available

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
              <div className="w-8 h-8 bg-orange-500 rounded-full" aria-hidden="true"></div>
              <span className="font-bold text-xl text-gray-800">Logo</span>
            </Link>

            {/* Right side: User Info / Auth */}
            <div className="flex items-center gap-4">
              {status === 'loading' && <Button variant="ghost" disabled>Loading...</Button>}
              {status === 'unauthenticated' && (
                <Button onClick={() => signIn('google')}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>
              )}
              {status === 'authenticated' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {session.user?.name ? session.user.name.split(' ')[0] : 'User'}
                  </span>
                  {/* Placeholder for User Menu */}
                  <Button variant="ghost" size="icon" aria-label="User menu">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                   <Button variant="outline" size="sm" onClick={() => signOut()}>
                    <LogOut className="mr-1 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status === 'authenticated' ? (
          <>
            {/* Child Selector - Placed prominently near the top */}
             <div className="mb-6" aria-live="polite" aria-busy={isLoadingChildren}>
                <ErrorBoundary
                  fallback={
                    <div className="w-full md:w-[250px] h-10 bg-red-50 border border-red-200 rounded-md flex items-center justify-center text-red-500 text-sm">
                      Error loading child selector
                    </div>
                  }
                >
                  {isLoadingChildren ? (
                     <div className="w-full md:w-[250px] h-10 bg-gray-100 rounded-md animate-pulse flex items-center justify-center">
                       <span className="text-xs text-gray-500">Loading children...</span>
                     </div>
                  ) : children.length > 0 ? (
                    <ChildSelector
                      children={children}
                      selectedChildId={selectedChildId}
                      onChildChange={handleChildChange}
                    />
                  ) : (
                     <Card className="bg-yellow-50 border-yellow-200">
                       <CardHeader className="flex-row items-center gap-4 space-y-0 py-3">
                         <Baby className="h-6 w-6 text-yellow-600" />
                         <div>
                            <CardTitle className="text-yellow-700 text-base">No Children Found</CardTitle>
                            <CardDescription className="text-yellow-600 text-sm">
                              Add a child to get started.
                            </CardDescription>
                         </div>
                       </CardHeader>
                       <CardContent className="pt-0 pb-3">
                         <Button size="sm" asChild>
                           <Link href="/children/add">Add Child</Link>
                         </Button>
                       </CardContent>
                     </Card>
                  )}
                </ErrorBoundary>
              </div>

            {/* Main Dashboard Grid - Only show if a child is selected */}
            {selectedChildId && selectedChild ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Child Photo Card (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1 bg-orange-50 overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between p-3 bg-orange-100">
                    <Button variant="ghost" size="icon" aria-label="Previous child photo view">
                      <ArrowLeft className="h-5 w-5 text-orange-700" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Options for child photo">
                      <MoreVertical className="h-5 w-5 text-orange-700" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 flex justify-center items-center aspect-square">
                     {/* Placeholder Image - Replace with actual child photo */}
                     <Image
                        src={mockChildPhotoUrl}
                        alt={selectedChild.name || 'Child photo'}
                        width={300}
                        height={300}
                        className="object-cover w-full h-full"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => e.currentTarget.src = '/placeholder-child-error.png'} // Fallback image
                      />
                  </CardContent>
                </Card>

                {/* Quick Actions Card (Span 1 column) */}
                <QuickLogCard />

                {/* Notification Card (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Notifications</CardTitle>
                    {/* Assuming this div is for a button or menu for notifications card options eventually */}
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600" role="button" tabIndex={0} aria-label="Notification options placeholder"> 
                      <span>980</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <DynamicPlaceholderChart type="line" />
                  </CardContent>
                </Card>

                {/* Scheduling Card (Span 1 column) */}
                <TodaysScheduleCard />

                {/* Child Progress Card (Span 1 column) */}
                <ChildProgressCard />

                {/* Analytics Card 1 (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Sleep Trends</CardTitle>
                     {/* Assuming this div is for a button or menu for sleep trends card options eventually */}
                     <div className="flex items-center gap-1 text-sm font-semibold text-green-600" role="button" tabIndex={0} aria-label="Sleep trends options placeholder">
                      <span>432</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <DynamicPlaceholderChart type="line" />
                  </CardContent>
                </Card>

                 {/* Analytics Card 2 (Span 1 column, potentially span 2 on larger screens if needed) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Activity Levels</CardTitle>
                     {/* Assuming this div is for a button or menu for activity levels card options eventually */}
                     <div className="flex items-center gap-1 text-sm font-semibold text-orange-600" role="button" tabIndex={0} aria-label="Activity levels options placeholder">
                      <span>800</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <DynamicPlaceholderChart type="bar" />
                  </CardContent>
                </Card>

                {/* Add more cards if needed based on mock */}

              </div>
            ) : (
              // Show message if loading or no child selected (and not handled by the selector card)
              !isLoadingChildren && children.length > 0 && !selectedChildId && (
                 <Card className="mt-6 bg-blue-50 border-blue-200">
                   <CardHeader>
                     <CardTitle className="text-blue-700">Select a Child</CardTitle>
                     <CardDescription className="text-blue-600">
                       Please select a child from the dropdown above to view their dashboard.
                     </CardDescription>
                   </CardHeader>
                 </Card>
              )
            )}
          </>
        ) : (
          // Unauthenticated State
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-4"></div>
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
