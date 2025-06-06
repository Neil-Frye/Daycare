'use client'; // Make it a client component

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChildSelector } from '@/components/child-selector'; // Use named import
import NapForm from './_components/nap-form';
import MealForm from './_components/meal-form';
import SleepForm from './_components/sleep-form';
import BathroomForm from './_components/bathroom-form';
import ActivityForm from './_components/activity-form';
import Link from 'next/link';
import supabaseClient from '@/lib/supabase/client'; // Use default import, renamed for clarity
import { type Database, type Tables } from '@/lib/supabase/types'; // Import Tables utility type
import logger from '@/lib/logger';

// Define Child type using the generated types
type Child = Tables<'children'>;

export default function ManualLogPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  // supabaseClient is already imported

  useEffect(() => {
    const fetchChildren = async () => {
      setIsLoadingChildren(true);
      // Fetching all accessible children based on RLS
      const { data, error } = await supabaseClient
        .from('children')
        .select('*') // Select all columns defined in the Child type
        .order('name', { ascending: true });

      if (error) {
        logger.error({ err: error }, 'Error fetching children');
        // Handle error display if necessary
      } else {
        setChildren(data || []);
        // Select the first child by default if available
        if (data && data.length > 0) {
          setSelectedChildId(data[0].id);
        }
      }
      setIsLoadingChildren(false);
    };

    fetchChildren();
  }, []); // Dependency array can be empty as supabaseClient instance doesn't change

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Manual Log Entry</h1>

      {isLoadingChildren ? (
        <p>Loading children...</p>
      ) : children.length === 0 ? (
        <p>
          No children found. Please{' '}
          <Link href="/children/add" className="text-blue-500 underline">
            add a child
          </Link>{' '}
          first.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Log an Event for:</CardTitle>
            <ChildSelector
              children={children}
              selectedChildId={selectedChildId}
              onChildChange={handleChildChange}
            />
          </CardHeader>
          <CardContent>
            {!selectedChildId ? (
              <p>Please select a child.</p>
            ) : (
              <Tabs defaultValue="nap" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="nap">Nap</TabsTrigger>
                  <TabsTrigger value="meal">Meal/Bottle</TabsTrigger>
                  <TabsTrigger value="sleep">Sleep</TabsTrigger>
                  <TabsTrigger value="bathroom">Bathroom</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="nap">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Nap</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NapForm childId={selectedChildId} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="meal">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Meal/Bottle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Pass selectedChildId */}
                      <MealForm childId={selectedChildId} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="sleep">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Sleep</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Pass selectedChildId */}
                      <SleepForm childId={selectedChildId} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="bathroom">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Bathroom Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Pass selectedChildId */}
                      <BathroomForm childId={selectedChildId} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Pass selectedChildId */}
                      <ActivityForm childId={selectedChildId} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
