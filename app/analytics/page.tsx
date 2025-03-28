'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </header>

      <div className="space-y-6">
        {/* Sleep Analytics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sleep Trends</CardTitle>
            <CardDescription>Total nap duration per day in minutes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center">
              <p className="text-center text-gray-500">
                This is a demo version of the analytics page.<br />
                In the full version, this would show sleep trend charts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Meal Analytics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Analytics</CardTitle>
            <CardDescription>Frequency and types of meals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center">
              <p className="text-center text-gray-500">
                This is a demo version of the analytics page.<br />
                In the full version, this would show meal analytics charts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Activity Analytics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Analytics</CardTitle>
            <CardDescription>Frequency, types, and patterns of activities.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center">
              <p className="text-center text-gray-500">
                This is a demo version of the analytics page.<br />
                In the full version, this would show activity analytics charts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
