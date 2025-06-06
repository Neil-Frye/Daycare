import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/server'; // Use server client
import { verifyChildOwnership } from '@/lib/supabase/utils';
import { aggregateMealData } from '@/lib/analytics/mealUtils'; // Import the aggregation utility
import { Database } from '@/lib/supabase/types';
import { Session } from 'next-auth';
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper

type DailyReportWithMeals = Database['public']['Tables']['daily_reports']['Row'] & {
  meals: Pick<Database['public']['Tables']['meals']['Row'], 'food_description'>[] | null;
};

// Define the core logic for the GET handler
const getMealAnalyticsHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  // Default date range (last 30 days)
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const startDate = searchParams.get('startDate') || defaultStartDate.toISOString().split('T')[0];

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  // Verify child ownership (errors caught by wrapper)
  await verifyChildOwnership(supabase, childId, userId);

  // Fetch meal data (errors caught by wrapper)
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

  if (reportError) {
    throw reportError; // Throw error to be handled by the wrapper
  }

  // Aggregate data using the utility function with typed data
  const typedData: DailyReportWithMeals[] = reportData ?? [];
  const aggregatedData = aggregateMealData(typedData);

  return NextResponse.json(aggregatedData);
};

// Export the wrapped handler
export const GET = withApiHandler(getMealAnalyticsHandler);
