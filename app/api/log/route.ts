import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server'; // Import the configured client instance
import { getUserSession, createUnauthorizedResponse } from '@/lib/auth/session'; // Import correct function and response helper
import { z } from 'zod';
import { Database } from '@/lib/supabase/types'; // Import generated types

// Define schemas for different log types based on form schemas
// Ensure these match the fields expected from the frontend forms
const napSchema = z.object({
  type: z.literal('nap'), // Or 'sleep' if we differentiate
  childId: z.string().uuid(),
  startTime: z.string().datetime(), // Expect ISO string from client
  endTime: z.string().datetime(),   // Expect ISO string from client
  notes: z.string().optional(),
});

const mealSchema = z.object({
  type: z.literal('meal'),
  childId: z.string().uuid(),
  time: z.string().datetime(),
  mealType: z.enum(['bottle', 'solid_food']), // Renamed from 'type' in form to avoid conflict
  foodDetails: z.string(),
  amount: z.string().optional(),
  notes: z.string().optional(),
});

const bathroomSchema = z.object({
  type: z.literal('bathroom'),
  childId: z.string().uuid(),
  time: z.string().datetime(),
  eventType: z.enum(['wet', 'dirty', 'dry', 'potty_attempt']), // Renamed from 'type' in form
  notes: z.string().optional(),
});

const activitySchema = z.object({
  type: z.literal('activity'),
  childId: z.string().uuid(),
  time: z.string().datetime(),
  description: z.string(),
  notes: z.string().optional(),
});

// Union schema for validation
const logSchema = z.discriminatedUnion('type', [
  napSchema,
  mealSchema,
  bathroomSchema,
  activitySchema,
]);

export async function POST(request: Request) {
  // supabase is already imported and configured
  let session;
  try {
    session = await getUserSession(); // Use the correct function
  } catch (error) {
    // Assuming getUserSession throws AuthenticationError on failure
    console.error('Authentication error:', error);
    return createUnauthorizedResponse(); // Use the helper for consistency
  }

  let logData;
  try {
    const body = await request.json();
    logData = logSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
  }

  // session is guaranteed to have user.id if getUserSession succeeded
  const userId = session.user.id;

  // Verify child ownership (important for security)
  const { data: childData, error: childError } = await supabase
    .from('children')
    .select('id')
    .eq('id', logData.childId)
    .eq('user_id', userId)
    .maybeSingle();

  if (childError || !childData) {
    console.error('Child verification failed:', childError);
    return NextResponse.json({ error: 'Child not found or access denied' }, { status: 403 });
  }

  try {
    let insertError;
    let insertData;

    // Define insert objects using the updated Database types
    switch (logData.type) {
      case 'nap': // Handles both Nap and Sleep forms for now
        const napInsert: Database['public']['Tables']['naps']['Insert'] = {
          child_id: logData.childId,
          start_time: logData.startTime,
          end_time: logData.endTime,
          notes: logData.notes,
          source: 'manual', // Set source explicitly
          report_id: null, // report_id is now correctly typed as string | null
        };
        ({ data: insertData, error: insertError } = await supabase
          .from('naps')
          .insert(napInsert)
          .select()
          .single());
        break;

      case 'meal':
        const mealInsert: Database['public']['Tables']['meals']['Insert'] = {
          child_id: logData.childId,
          meal_time: logData.time,
          food_description: logData.foodDetails, // Map form field to DB column
          // TODO: Consider adding 'amount' and 'mealType' columns to the 'meals' table
          // For now, combining into 'details' or 'notes' might be lossy.
          // Let's put amount in notes for now.
          details: `Type: ${logData.mealType}`, // Keep details for original email text if needed later
          notes: `Amount: ${logData.amount || 'N/A'}. ${logData.notes || ''}`.trim(),
          source: 'manual',
          report_id: null, // report_id is now correctly typed as string | null
        };
        ({ data: insertData, error: insertError } = await supabase
          .from('meals')
          .insert(mealInsert)
          .select()
          .single());
        break;

      case 'bathroom':
        const bathroomInsert: Database['public']['Tables']['bathroom_events']['Insert'] = {
          child_id: logData.childId,
          event_time: logData.time,
          type: logData.eventType, // Map form field to DB column
          notes: logData.notes,
          source: 'manual',
          report_id: null, // report_id is now correctly typed as string | null
        };
        ({ data: insertData, error: insertError } = await supabase
          .from('bathroom_events')
          .insert(bathroomInsert)
          .select()
          .single());
        break;

      case 'activity':
        const activityInsert: Database['public']['Tables']['activities']['Insert'] = {
          child_id: logData.childId,
          time: logData.time, // Use the 'time' column added in migration
          description: logData.description,
          notes: logData.notes,
          source: 'manual',
          report_id: null, // report_id is now correctly typed as string | null
        };
        ({ data: insertData, error: insertError } = await supabase
          .from('activities')
          .insert(activityInsert)
          .select()
          .single());
        break;

      default:
        // Should not happen due to Zod validation, but good practice
        return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    if (insertError) {
      console.error(`Error inserting ${logData.type} log:`, insertError);
      throw insertError; // Throw to be caught by the outer catch block
    }

    return NextResponse.json({ message: `${logData.type} logged successfully`, data: insertData }, { status: 201 });

  } catch (error) {
    console.error('API Error logging event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to log event: ${errorMessage}` }, { status: 500 });
  }
}
