"use client";

import { useEffect, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, Clock, Utensils, Brain } from 'lucide-react';
import supabase from '@/lib/supabase/client';
import { type Tables } from '@/lib/supabase/types'; // Import Tables

interface ChildMetricsProps {
  childId: string;
}

interface Metrics {
  totalNapTime: number;
  avgMealsPerDay: number;
  totalActivities: number;
  lastReportTime: string;
}

// Original component, renamed to avoid export conflict
function ChildMetricsComponent({ childId }: ChildMetricsProps) {
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

      // 1. Fetch daily_reports (including IDs and other needed fields like created_at)
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('id, date, created_at') // Select all fields needed from reports
        .eq('child_id', childId)
        .gte('date', lastWeek.toISOString())
        .order('date', { ascending: false }); // Removed type assertion

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        // Optionally, set metrics to a default error state or clear them
        setMetrics({ totalNapTime: 0, avgMealsPerDay: 0, totalActivities: 0, lastReportTime: 'Error' });
        return;
      }

      if (!reportsData || reportsData.length === 0) {
        // Handle case with no reports
        setMetrics({ totalNapTime: 0, avgMealsPerDay: 0, totalActivities: 0, lastReportTime: '' });
        return;
      }

      const reportIds = reportsData.map(r => r.id);
      const lastReportTime = reportsData[0]?.created_at || ''; // Get from already fetched reports

      // 2. Fetch related data using the reportIds
      const [
        { data: napsData, error: napsError }, // Renamed to avoid conflict
        { data: mealsData, error: mealsError }, // Renamed to avoid conflict
        { data: activitiesData, error: activitiesError } // Renamed to avoid conflict
      ] = await Promise.all([
        supabase.from('naps').select('duration_text, report_id').in('report_id', reportIds), // Removed type assertion
        supabase.from('meals').select('report_id').in('report_id', reportIds), // Removed type assertion
        supabase.from('activities').select('report_id').in('report_id', reportIds) // Removed type assertion
      ]);

      if (napsError || mealsError || activitiesError) {
        console.error('Error fetching related metrics:', { napsError, mealsError, activitiesError });
        // Potentially set some metrics to zero or handle partial data, or show error state
        // For now, we'll set activities to 0 and report time, but keep potentially fetched nap/meal data
        setMetrics(prevMetrics => ({
          ...prevMetrics, // Keep potentially valid data from previous steps
          totalActivities: prevMetrics.totalActivities, // Or 0 if preferred on error
          lastReportTime: lastReportTime || 'Error fetching details', // Indicate partial error
        }));
        // Decide if you want to return or proceed with partial data
        // return; 
      }

      // Calculate total nap time by parsing duration_text (e.g. "1 hr 30 min")
      const napTimes = napsData?.reduce((total: number, nap: Pick<Tables<'naps'>, 'duration_text' | 'report_id'>) => {
        // Regex: (\d+)\s*hr\s*(\d+)\s*min
        const match = nap.duration_text?.match(/(\d+)\s*hr\s*(\d+)\s*min/);
        if (match) {
          return total + (parseInt(match[1]) * 60) + parseInt(match[2]);
        }
        // Regex: (\d+)\s*hr
        const hrMatch = nap.duration_text?.match(/(\d+)\s*hr/);
        if (hrMatch) {
          return total + (parseInt(hrMatch[1]) * 60);
        }
        // Regex: (\d+)\s*min
        const minMatch = nap.duration_text?.match(/(\d+)\s*min/);
        if (minMatch) {
            return total + parseInt(minMatch[1]);
        }
        return total;
      }, 0) || 0;

      const mealCount = mealsData?.length || 0;
      const activityCount = activitiesData?.length || 0;
      
      // Determine the number of unique days with reports in the last 7 days
      const uniqueReportDays = new Set(reportsData.map((report: Pick<Tables<'daily_reports'>, 'id' | 'date' | 'created_at'>) => new Date(report.date).toDateString())).size;
      const daysToAverage = uniqueReportDays > 0 ? uniqueReportDays : 1; // Avoid division by zero, default to 1 if no reports

      setMetrics({
        totalNapTime: napTimes,
        avgMealsPerDay: mealCount / daysToAverage, // Use dynamic number of days
        totalActivities: activityCount,
        lastReportTime: lastReportTime,
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
          {/* The 'reportsData' variable is not accessible here in the original code. 
              This part of the UI might need state for 'uniqueReportDays' if dynamic text is required.
              For now, we'll keep it simple or use a fixed text, as fixing this UI logic is outside direct TS strictness.
              A simple check on metrics.lastReportTime implies reportsData was processed.
          */}
          <p className="text-xs text-muted-foreground">Last {metrics.lastReportTime && metrics.lastReportTime !== 'Error' ? 'processed' : '7'} days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Meals/Day</CardTitle>
          <Utensils className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgMealsPerDay.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Over actual report days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activities</CardTitle>
          <Brain className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalActivities}</div>
          <p className="text-xs text-muted-foreground">Last {metrics.lastReportTime && metrics.lastReportTime !== 'Error' ? 'processed' : '7'} days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.lastReportTime ? new Date(metrics.lastReportTime).toLocaleTimeString() : 'N/A'}</div>
          <p className="text-xs text-muted-foreground">Most recent report time</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Export the memoized version with the original name
export const ChildMetrics = memo(ChildMetricsComponent);
