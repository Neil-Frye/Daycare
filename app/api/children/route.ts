import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
  }

  const { name, birthDate, gender } = await request.json()

  console.log('Attempting to insert child:', { name, birthDate, userId: session.user.id });
  
  const { data, error } = await supabase
    .from('children')
    .insert([
      { 
        name,
        birth_date: birthDate,
        gender: gender || null,
        user_id: session.user.id
      }
    ])
    .select()

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }, { status: 500 })
  }

  return NextResponse.json(data[0])
}

export async function GET() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
