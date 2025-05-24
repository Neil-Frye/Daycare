import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { Session } from 'next-auth';
import { withApiHandler } from '@/lib/api/handler';
import { z } from 'zod';

// Define Zod schema for child creation
const childSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required." }),
  lastName: z.string().trim().min(1, { message: "Last name is required." }),
  birthDate: z.string().refine(val => {
    const date = new Date(val);
    // Check if the date is valid and not in the future
    return !isNaN(date.getTime()) && date <= new Date();
  }, { message: "Invalid birth date or birth date is in the future." })
  .transform(val => new Date(val).toISOString().split('T')[0]), // Transform to YYYY-MM-DD
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']).optional().nullable(),
  notes: z.string().trim().max(500, { message: "Notes must be 500 characters or less." }).optional().nullable(),
});

// Define the core logic for the POST handler
const postChildHandler = async (request: NextRequest, session: Session) => {
  const userId = session.user.id;
  const requestBody = await request.json();

  const validationResult = childSchema.safeParse(requestBody);

  if (!validationResult.success) {
    logger.warn({ userId, route: '/api/children', errors: validationResult.error.flatten() }, "Child data validation failed.");
    return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { firstName, lastName, birthDate, gender, notes } = validationResult.data;

  logger.info({ userId, firstName, lastName, birthDate }, 'Attempting to insert child with validated data');

  const { data, error } = await supabase
    .from('children')
    .insert([
      {
        name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate, // Already transformed to YYYY-MM-DD by Zod
        gender: gender,       // Will be null if not provided or explicitly null
        notes: notes,         // Will be null if not provided or explicitly null
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    logger.error({ userId, route: '/api/children', error: error.message }, "Error inserting child into Supabase.");
    // Throw the error to be caught by the withApiHandler wrapper
    throw error;
  }

  logger.info({ userId, childId: data?.id }, "Child successfully inserted.");
  return NextResponse.json(data, { status: 201 }); // Return 201 Created status
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
