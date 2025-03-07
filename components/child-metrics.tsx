"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, Clock, Utensils, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ChildMetricsProps {
  childId: string;
}

interface Metrics {
  totalNapTime: number;
  avgMealsPerDay: number;
  totalActivities: number;
  lastReportTime: string;
}

export function ChildMetrics({ childId }: ChildMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    totalNapTime: 0,
    avgMealsPerDay: 0,
    totalActivities: 0,
    lastReportTime: '',
  });

  useEffect(() => {
    async function fetchMetrics() {
      if (!childId) return;

      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: reports, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('child_id', childId)
        .gte('date', lastWeek.toISOString())
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching metrics:', error);
        return;
      }

      // Calculate metrics
      const napTimes = reports
        .filter((r) => r.category === 'Nap' && r.duration)
        .reduce((total, r) => total + parseInt(r.duration || '0', 10), 0);

      const meals = reports.filter((r) => r.category === 'Meal').length;
      const activities = reports.filter((r) => r.category === 'Activity').length;
      const lastReport = reports[0]?.time || '';

      setMetrics({
        totalNapTime: napTimes,
        avgMealsPerDay: meals / 7,
        totalActivities: activities,
        lastReportTime: lastReport,
      });
    }

    fetchMetrics();
  }, [childId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Nap Time</CardTitle>
          <Baby className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalNapTime} min</div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Meals/Day</CardTitle>
          <Utensils className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgMealsPerDay.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activities</CardTitle>
          <Brain className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalActivities}</div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.lastReportTime || 'N/A'}</div>
          <p className="text-xs text-muted-foreground">Most recent report</p>
        </CardContent>
      </Card>
    </div>
  );
}