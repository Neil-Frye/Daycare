import { NextResponse, type NextRequest } from 'next/server'; // Added NextRequest
import { supabase } from '@/lib/supabase/server';
import { z } from 'zod';
import { Database } from '@/lib/supabase/types';
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper
import { type Session } from 'next-auth'; // Import Session type
import logger from '@/lib/logger'; // Import logger for consistency if needed later

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

// Define the core handler logic
async function logEventHandler(request: NextRequest, session: Session): Promise<NextResponse> {
  // Authentication is handled by the wrapper, session is guaranteed to be valid
  const userId = session.user.id;

  // 1. Parse and validate request body
  let logData;
  try {
    const body = await request.json();
    logData = logSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ userId, errors: error.errors }, 'Log validation failed');
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    // Log parsing errors specifically, as they won't be caught well by the generic handler
    logger.error({ userId, error }, 'Failed to parse request body for log');
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
  }

  // 2. Verify child ownership (Authorization)
  const { data: childData, error: childError } = await supabase
    .from('children')
    .select('id')
    .eq('id', logData.childId)
    .eq('user_id', userId) // Use userId from the authenticated session
    .maybeSingle();

  // Handle potential error during child check or if child not found/accessible
  if (childError) {
    // Let the main handler catch and log Supabase errors
    throw childError;
  }
  if (!childData) {
    logger.warn({ userId, childId: logData.childId }, 'Attempt to log for unauthorized/non-existent child');
    // Use a specific 403 Forbidden status
    return NextResponse.json({ error: 'Child not found or access denied' }, { status: 403 });
  }

  // 3. Perform database insertion based on type
  // The outer wrapper will handle generic errors, including Supabase errors from here on
  let insertError;
  let insertData;

  switch (logData.type) {
    case 'nap':
      const napInsert: Database['public']['Tables']['naps']['Insert'] = {
        child_id: logData.childId, start_time: logData.startTime, end_time: logData.endTime,
        notes: logData.notes, source: 'manual', report_id: null,
      };
      ({ data: insertData, error: insertError } = await supabase.from('naps').insert(napInsert).select().single());
      break;
    case 'meal':
      const mealInsert: Database['public']['Tables']['meals']['Insert'] = {
        child_id: logData.childId, meal_time: logData.time, food_description: logData.foodDetails,
        details: `Type: ${logData.mealType}`, notes: `Amount: ${logData.amount || 'N/A'}. ${logData.notes || ''}`.trim(),
        source: 'manual', report_id: null,
      };
      ({ data: insertData, error: insertError } = await supabase.from('meals').insert(mealInsert).select().single());
      break;
    case 'bathroom':
      const bathroomInsert: Database['public']['Tables']['bathroom_events']['Insert'] = {
        child_id: logData.childId, event_time: logData.time, type: logData.eventType,
        notes: logData.notes, source: 'manual', report_id: null,
      };
      ({ data: insertData, error: insertError } = await supabase.from('bathroom_events').insert(bathroomInsert).select().single());
      break;
    case 'activity':
      const activityInsert: Database['public']['Tables']['activities']['Insert'] = {
        child_id: logData.childId, time: logData.time, description: logData.description,
        notes: logData.notes, source: 'manual', report_id: null,
      };
      ({ data: insertData, error: insertError } = await supabase.from('activities').insert(activityInsert).select().single());
      break;
    default:
      // Should not happen due to Zod validation, but good practice
      logger.error({ userId, type: (logData as any).type }, 'Invalid log type encountered after validation');
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
  }

  // Check for Supabase insert error specifically
  if (insertError) {
    // Let the wrapper handle logging and generic response
    throw insertError;
  }

  // 4. Return success response
  logger.info({ userId, logType: logData.type, childId: logData.childId }, 'Manual log created successfully');
  return NextResponse.json({ message: `${logData.type} logged successfully`, data: insertData }, { status: 201 });
}

// Export the wrapped handler for the POST method
export const POST = withApiHandler(logEventHandler);
