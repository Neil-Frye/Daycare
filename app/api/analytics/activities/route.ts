import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase/client';
import { type NextAuthOptions } from 'next-auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as NextAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30); // Default to last 30 days
  const startDate = searchParams.get('startDate') || defaultStartDate.toISOString().split('T')[0];

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  try {
    // Verify child belongs to the user
    const { data: childCheck, error: childCheckError } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('user_id', userId)
      .maybeSingle();

    if (childCheckError) throw childCheckError;
    if (!childCheck) {
      return NextResponse.json({ error: 'Child not found or access denied' }, { status: 404 });
    }

    // Fetch activity data within the date range
    const { data: reportData, error: reportError } = await supabase
      .from('daily_reports')
      .select(`
        date,
        activities ( description )
      `)
      .eq('child_id', childId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (reportError) throw reportError;

    // Aggregate data: count activities per day and by type
    const dailyActivityCount: { [date: string]: number } = {};
    const activityTypeCounts: { [activity: string]: number } = {};
    const activityByDayOfWeek: { [day: string]: { [activity: string]: number } } = {};

    reportData.forEach(report => {
      const date = new Date(report.date + 'T00:00:00');
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const activities = Array.isArray(report.activities) ? report.activities : [report.activities];

      // Count total activities per day
      dailyActivityCount[report.date] = activities.length;

      // Count by activity type
      activities.forEach((activity: any) => {
        // Extract main activity type (first few words)
        const activityType = activity.description.split(' ').slice(0, 3).join(' ');
        activityTypeCounts[activityType] = (activityTypeCounts[activityType] || 0) + 1;

        // Count by day of week
        if (!activityByDayOfWeek[dayOfWeek]) {
          activityByDayOfWeek[dayOfWeek] = {};
        }
        activityByDayOfWeek[dayOfWeek][activityType] = 
          (activityByDayOfWeek[dayOfWeek][activityType] || 0) + 1;
      });
    });

    // Format for charts
    const frequencyChartData = Object.entries(dailyActivityCount).map(([date, count]) => ({
      date,
      count,
    }));

    const breakdownChartData = Object.entries(activityTypeCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 10) // Limit to top 10
      .map(([name, value]) => ({
        name,
        value,
      }));

    // Format for heatmap (day of week vs activity type)
    const heatmapData = Object.entries(activityByDayOfWeek).map(([day, activities]) => {
      const dayData: any = { day };
      Object.entries(activities).forEach(([activity, count]) => {
        dayData[activity] = count;
      });
      return dayData;
    });

    return NextResponse.json({
      frequency: frequencyChartData,
      breakdown: breakdownChartData,
      heatmap: heatmapData,
      activityTypes: Object.keys(activityTypeCounts).sort((a, b) => 
        activityTypeCounts[b] - activityTypeCounts[a]
      ).slice(0, 10) // Top 10 activity types
    });

  } catch (error: any) {
    console.error('Error fetching activity analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch activity analytics', details: error.message }, { status: 500 });
  }
}
