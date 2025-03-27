import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase/client';
import { type NextAuthOptions } from 'next-auth';

// Helper function to parse interval string like "1 hr 41 mins" to minutes
function parseDurationToMinutes(durationText: string | null): number {
  if (!durationText) return 0;
  let totalMinutes = 0;
  const hourMatch = durationText.match(/(\d+)\s*hr/);
  const minMatch = durationText.match(/(\d+)\s*min/);
  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  return totalMinutes;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as NextAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  // Default to last 30 days if no dates provided
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
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

    if (reportError) throw reportError;

    // Aggregate data: total nap duration per day
    const aggregatedData: { [date: string]: number } = {};

    reportData.forEach(report => {
      const dateStr = report.date; // Already in YYYY-MM-DD format
      if (!aggregatedData[dateStr]) {
        aggregatedData[dateStr] = 0;
      }
      // The result is an array because of the one-to-many relationship
      const naps = Array.isArray(report.naps) ? report.naps : [report.naps];
      naps.forEach((nap: any) => { // Use 'any' for simplicity, refine if needed
        aggregatedData[dateStr] += parseDurationToMinutes(nap.duration_text);
      });
    });

    // Format for recharts (e.g., [{ date: 'YYYY-MM-DD', totalMinutes: 120 }, ...])
    const chartData = Object.entries(aggregatedData).map(([date, totalMinutes]) => ({
      date,
      totalMinutes,
    }));

    return NextResponse.json(chartData);

  } catch (error: any) {
    console.error('Error fetching sleep analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch sleep analytics', details: error.message }, { status: 500 });
  }
}
