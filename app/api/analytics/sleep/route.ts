import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { verifyChildOwnership } from '@/lib/supabase/utils'; // Keep verifyChildOwnership
import { aggregateSleepData } from '@/lib/analytics/sleepUtils';
import { Session } from 'next-auth';
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper

// Define the core logic for the GET handler
const getSleepAnalyticsHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  // Default to last 30 days if no dates provided
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const startDate = searchParams.get('startDate') || defaultStartDate.toISOString().split('T')[0];

  if (!childId) {
    // Return validation error directly
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  // Verify child ownership (specific to this route, keep inside handler)
  // AuthorizationError and NotFoundError will be caught by the wrapper
  await verifyChildOwnership(supabase, childId, userId);

  // Fetch nap data within the date range
  const { data: reportData, error: reportError } = await supabase
    .from('daily_reports')
    .select(`
      date,
      naps ( duration_text )
    `)
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (reportError) {
    // Throw Supabase error to be caught by the wrapper
    throw reportError;
  }

  // Aggregate data using the utility function
  // Ensure reportData matches the expected input type for aggregateSleepData
  const chartData = aggregateSleepData(reportData as any); // Use 'as any' for now, refine with proper types if needed

  return NextResponse.json(chartData);
};

// Export the wrapped handler
export const GET = withApiHandler(getSleepAnalyticsHandler);
