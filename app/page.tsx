"use client";

import React, { useState, useEffect } from 'react';
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

const CircularProgress = ({ value, label }: { value: string, label: string }) => (
    <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-300 mb-2">
            <span className="text-green-700 font-semibold text-lg">{value}</span>
        </div>
        <span className="text-sm text-gray-600">{label}</span>
    </div>
);

export default function Home() {
  const { data: session, status } = useSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null); // Store selected child object

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
          setChildren([]);
        } else {
          setChildren(data || []);
          if (data && data.length > 0) {
            // If no child is selected, or the previously selected one isn't in the list anymore, select the first one.
            const currentSelectionValid = selectedChildId && data.some(c => c.id === selectedChildId);
            if (!currentSelectionValid) {
              setSelectedChildId(data[0].id);
              setSelectedChild(data[0]); // Also set the selected child object
            } else {
              // Update selected child object in case details changed
              setSelectedChild(data.find(c => c.id === selectedChildId) || null);
            }
          } else {
            setSelectedChildId(null); // No children
            setSelectedChild(null);
          }
        }
        setIsLoadingChildren(false);
      };
      fetchChildren();
    } else {
      setChildren([]);
      setSelectedChildId(null);
      setSelectedChild(null);
      setIsLoadingChildren(false);
    }
  }, [status, selectedChildId]); // Re-run if status changes or selectedChildId is programmatically changed

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
    setSelectedChild(children.find(c => c.id === childId) || null);
  };

  // Mock data for display based on the design
  const mockChildPhotoUrl = '/placeholder-child.jpg'; // Replace with actual logic if available

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
              <span className="font-bold text-xl text-gray-800">Logo</span>
            </div>

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
                  <Button variant="ghost" size="icon">
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
             <div className="mb-6">
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
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-5 w-5 text-orange-700" />
                    </Button>
                    <Button variant="ghost" size="icon">
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
                        onError={(e) => e.currentTarget.src = '/placeholder-child-error.png'} // Fallback image
                      />
                  </CardContent>
                </Card>

                {/* Quick Actions Card (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1 bg-green-50">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium text-green-800">Quick Log</CardTitle>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5 text-green-700" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <Utensils className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Meal</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <Bed className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Nap</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <ToyBrick className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Activity</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <Smile className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Mood</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <MessageSquare className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Note</span>
                      </Button>
                       <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-xs">Diaper</span>
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button className="flex-1 bg-orange-400 hover:bg-orange-500 text-white">
                        View Log
                      </Button>
                      <Button variant="outline" className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50">
                        <Plus className="mr-1 h-4 w-4" /> Add Entry
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Card (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Notifications</CardTitle>
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <span>980</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <PlaceholderChart type="line" />
                  </CardContent>
                </Card>

                {/* Scheduling Card (Span 1 column) */}
                 <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center gap-2 p-3">
                    <CircleUserRound className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-base font-medium">Today's Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Placeholder Schedule Items */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">1</span>
                            <span className="text-sm">Activity Name</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>5 mins</span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                    </div>
                     <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">2</span>
                            <span className="text-sm">Diaper Change</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>10 mins ago</span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                    </div>
                     <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">3</span>
                            <span className="text-sm">Nap Time</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Upcoming</span>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </div>
                    </div>
                    {/* Add illustration placeholder if needed */}
                    {/* <div className="mt-2 h-20 bg-orange-100 rounded flex items-center justify-center text-orange-400">Illustration Placeholder</div> */}
                  </CardContent>
                </Card>

                {/* Child Progress Card (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <div>
                        <CardTitle className="text-base font-medium">Child Progress</CardTitle>
                        <CardDescription className="text-xs">Summary</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-around items-center">
                    {/* Placeholder Circular Progress */}
                    <CircularProgress value="1/8" label="Meals" />
                    <CircularProgress value="927" label="Steps" />
                    <CircularProgress value="122" label="Mins Nap" />
                  </CardContent>
                </Card>

                {/* Analytics Card 1 (Span 1 column) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Sleep Trends</CardTitle>
                     <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <span>432</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <PlaceholderChart type="line" />
                  </CardContent>
                </Card>

                 {/* Analytics Card 2 (Span 1 column, potentially span 2 on larger screens if needed) */}
                <Card className="md:col-span-1 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between p-3">
                    <CardTitle className="text-base font-medium">Activity Levels</CardTitle>
                     <div className="flex items-center gap-1 text-sm font-semibold text-orange-600">
                      <span>800</span>
                      <span className="text-xs text-gray-500">GC</span> {/* Placeholder */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <PlaceholderChart type="bar" />
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
