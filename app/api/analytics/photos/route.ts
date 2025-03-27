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
  const limit = searchParams.get('limit') || '30';
  const offset = searchParams.get('offset') || '0';

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

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
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('child_id', childId)
    .order('date', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
