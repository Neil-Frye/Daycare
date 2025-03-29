import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/server'; // Use server client
import { verifyChildOwnership } from '@/lib/supabase/utils';
import { Session } from 'next-auth';
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper

// Define the core logic for the GET handler
const getPhotosHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  // Pagination parameters
  const limitParam = searchParams.get('limit') || '30';
  const offsetParam = searchParams.get('offset') || '0';
  const limit = parseInt(limitParam, 10);
  const offset = parseInt(offsetParam, 10);

  // Validate parameters
  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }
  if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
    return NextResponse.json({ error: 'Invalid limit or offset parameters' }, { status: 400 });
  }

  // Verify child ownership (errors caught by wrapper)
  await verifyChildOwnership(supabase, childId, userId);

  // Fetch photos with pagination (errors caught by wrapper)
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('child_id', childId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error; // Throw error to be handled by the wrapper
  }

  return NextResponse.json(data);
};

// Export the wrapped handler
export const GET = withApiHandler(getPhotosHandler);
