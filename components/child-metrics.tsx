"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, Clock, Utensils, Brain } from 'lucide-react';
import supabase from '@/lib/supabase/client';

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

      // Fetch reports and related data in parallel
      const [
        { data: reports, error: reportsError },
        { data: naps, error: napsError },
        { data: meals, error: mealsError },
        { data: activities, error: activitiesError }
      ] = await Promise.all([
        supabase
          .from('daily_reports')
          .select('id, date, created_at')
          .eq('child_id', childId)
          .gte('date', lastWeek.toISOString())
          .order('date', { ascending: false }),
        supabase
          .from('naps')
          .select('duration_text, report_id')
          .in('report_id', 
            (await supabase
              .from('daily_reports')
              .select('id')
              .eq('child_id', childId)
              .gte('date', lastWeek.toISOString())
            ).data?.map(r => r.id) || []
          ),
        supabase
          .from('meals')
          .select('report_id')
          .in('report_id', 
            (await supabase
              .from('daily_reports')
              .select('id')
              .eq('child_id', childId)
              .gte('date', lastWeek.toISOString())
            ).data?.map(r => r.id) || []
          ),
        supabase
          .from('activities')
          .select('report_id')
          .in('report_id', 
            (await supabase
              .from('daily_reports')
              .select('id')
              .eq('child_id', childId)
              .gte('date', lastWeek.toISOString())
            ).data?.map(r => r.id) || []
          )
      ]);

      if (reportsError || napsError || mealsError || activitiesError) {
        console.error('Error fetching metrics:', { reportsError, napsError, mealsError, activitiesError });
        return;
      }

      // Calculate total nap time by parsing duration_text (e.g. "1 hr 30 min")
      const napTimes = naps?.reduce((total, nap) => {
        const match = nap.duration_text?.match(/(\d+)\s*hr\s*(\d+)\s*min/);
        if (match) {
          return total + (parseInt(match[1]) * 60) + parseInt(match[2]);
        }
        return total;
      }, 0) || 0;

      const mealCount = meals?.length || 0;
      const activityCount = activities?.length || 0;
      const lastReport = reports?.[0]?.created_at || '';

      setMetrics({
        totalNapTime: napTimes,
        avgMealsPerDay: mealCount / 7,
        totalActivities: activityCount,
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
