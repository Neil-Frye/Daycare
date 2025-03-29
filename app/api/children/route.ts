import { NextResponse, type NextRequest } from 'next/server'; // Add NextRequest
import { supabase } from '@/lib/supabase/server'; // Ensure server client is used
// Restore imports needed for POST handler (until it's refactored)
import { getUserSession, createUnauthorizedResponse, AuthenticationError } from '@/lib/auth/session';
import logger from '@/lib/logger'; // Import the centralized logger
import { Session } from 'next-auth'; // Import Session type
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper

// Define the core logic for the POST handler
const postChildHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;

  // Get request body (JSON parsing errors will be caught by the wrapper)
  const { name, birthDate, gender } = await request.json();

  // Basic validation (can be enhanced)
  if (!name || !birthDate) {
      // Return a standard validation error response
      return NextResponse.json({ error: 'Missing required fields: name and birthDate' }, { status: 400 });
  }

  // Log the attempt (optional, could be moved to wrapper or removed)
  // logger.info({ userId, name, birthDate }, 'Attempting to insert child');

  // Insert child data (Supabase errors will be caught by the wrapper)
  const { data, error } = await supabase
    .from('children')
    .insert([
      {
        name,
        birth_date: birthDate,
        gender: gender || null,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    // Throw the error to be caught by the wrapper
    throw error;
  }

  // Return the newly created child object on success
  return NextResponse.json(data);
};

// Export the wrapped POST handler
export const POST = withApiHandler(postChildHandler);


// Define the core logic for the GET handler
const getChildrenHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;

  // Fetch children for the user (error handling is now done by the wrapper)
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    // Throw the error to be caught by the wrapper's catch block
    throw error;
  }

  return NextResponse.json(data);
};

// Export the wrapped handler
export const GET = withApiHandler(getChildrenHandler);
