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

    // Fetch meal data within the date range
    const { data: reportData, error: reportError } = await supabase
      .from('daily_reports')
      .select(`
        date,
        meals ( food_description )
      `)
      .eq('child_id', childId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (reportError) throw reportError;

    // Aggregate data: count meals per day and count food types
    const dailyFrequency: { [date: string]: number } = {};
    const foodTypeCounts: { [food: string]: number } = {};

    reportData.forEach(report => {
      const dateStr = report.date;
      const meals = Array.isArray(report.meals) ? report.meals : [report.meals];

      if (!dailyFrequency[dateStr]) {
        dailyFrequency[dateStr] = 0;
      }
      dailyFrequency[dateStr] += meals.length; // Count meals for the day

      meals.forEach((meal: any) => {
        // Basic food type aggregation (can be refined)
        const foodType = (meal.food_description || 'Unknown').split(' ')[0]; // e.g., "6oz" -> "6oz", "Yogurt" -> "Yogurt"
        foodTypeCounts[foodType] = (foodTypeCounts[foodType] || 0) + 1;
      });
    });

    // Format for charts
    const frequencyChartData = Object.entries(dailyFrequency).map(([date, count]) => ({
      date,
      count,
    }));

    const breakdownChartData = Object.entries(foodTypeCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({
        frequency: frequencyChartData,
        breakdown: breakdownChartData
    });

  } catch (error: any) {
    console.error('Error fetching meal analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch meal analytics', details: error.message }, { status: 500 });
  }
}
