import { NextResponse, type NextRequest } from 'next/server';
import { Session } from 'next-auth';
import { supabase } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api/handler';
import logger from '@/lib/logger';

// Define a type for the expected request body for POST
interface CreateProviderRequestBody {
    provider_name: string;
    report_sender_email: string;
    parser_strategy?: string;
}

/**
 * GET /api/user-daycare-providers
 * Fetches all daycare provider configurations for the authenticated user.
 */
const getProvidersHandler = async (request: NextRequest, session: Session) => {
    const userId = session.user.id;

    try {
        const { data, error } = await supabase
            .from('user_daycare_providers')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error({ userId, route: '/api/user-daycare-providers', error: error.message }, 'Error fetching providers from Supabase.');
            return NextResponse.json({ error: 'Failed to retrieve provider configurations.' }, { status: 500 });
        }

        logger.info({ userId, route: '/api/user-daycare-providers', count: data?.length }, 'Successfully fetched provider configurations.');
        return NextResponse.json(data || []);
    } catch (e: any) {
        logger.error({ userId, route: '/api/user-daycare-providers', error: e.message }, 'Unexpected error fetching providers.');
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
};

/**
 * POST /api/user-daycare-providers
 * Creates a new daycare provider configuration for the authenticated user.
 */
const createProviderHandler = async (request: NextRequest, session: Session) => {
    const userId = session.user.id;
    let body;

    try {
        body = await request.json() as CreateProviderRequestBody;
    } catch (e) {
        logger.warn({ userId, route: '/api/user-daycare-providers' }, 'Invalid JSON in request body for POST.');
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }

    const { provider_name, report_sender_email, parser_strategy } = body;

    // Basic validation
    if (!provider_name || !report_sender_email) {
        logger.warn({ userId, route: '/api/user-daycare-providers', body }, 'Missing required fields for creating provider.');
        return NextResponse.json({ error: 'Missing required fields: provider_name and report_sender_email are required.' }, { status: 400 });
    }
    
    // Validate email format (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(report_sender_email)) {
        logger.warn({ userId, route: '/api/user-daycare-providers', email: report_sender_email }, 'Invalid email format for report_sender_email.');
        return NextResponse.json({ error: 'Invalid email format for report_sender_email.' }, { status: 400 });
    }


    try {
        const { data, error } = await supabase
            .from('user_daycare_providers')
            .insert([
                {
                    user_id: userId,
                    provider_name,
                    report_sender_email,
                    parser_strategy: parser_strategy || null, // Ensure null if undefined
                },
            ])
            .select() // Return the created record
            .single(); // Expect a single record to be created and returned

        if (error) {
            // Check for unique constraint violation (user_id, report_sender_email)
            if (error.code === '23505') { // PostgreSQL unique violation error code
                 logger.warn({ userId, route: '/api/user-daycare-providers', provider_name, report_sender_email, error: error.message }, 'Attempted to create a duplicate provider configuration.');
                return NextResponse.json({ error: 'A provider configuration with this sender email already exists.' }, { status: 409 }); // 409 Conflict
            }
            logger.error({ userId, route: '/api/user-daycare-providers', error: error.message }, 'Error creating provider in Supabase.');
            return NextResponse.json({ error: 'Failed to create provider configuration.' }, { status: 500 });
        }

        logger.info({ userId, route: '/api/user-daycare-providers', providerId: data?.id }, 'Successfully created provider configuration.');
        return NextResponse.json(data, { status: 201 }); // 201 Created
    } catch (e: any) {
        logger.error({ userId, route: '/api/user-daycare-providers', error: e.message }, 'Unexpected error creating provider.');
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
};

// Export wrapped handlers
export const GET = withApiHandler(getProvidersHandler);
export const POST = withApiHandler(createProviderHandler);
