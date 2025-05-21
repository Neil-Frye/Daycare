import { NextResponse, type NextRequest } from 'next/server';
import { Session } from 'next-auth';
import { supabase } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api/handler';
import logger from '@/lib/logger';

// Define a type for the expected request body for PUT
interface UpdateProviderRequestBody {
    provider_name?: string;
    report_sender_email?: string;
    parser_strategy?: string;
}

interface RouteContext {
    params: {
        id: string; // The ID from the dynamic route segment
    };
}

/**
 * PUT /api/user-daycare-providers/[id]
 * Updates an existing daycare provider configuration for the authenticated user.
 */
const updateProviderHandler = async (request: NextRequest, session: Session, context: RouteContext) => {
    const userId = session.user.id;
    const { id: providerId } = context.params;
    let body;

    if (!providerId) {
        logger.warn({ userId, route: `/api/user-daycare-providers/[id]` }, 'Missing provider ID in request path.');
        return NextResponse.json({ error: 'Provider ID is required.' }, { status: 400 });
    }
    
    // Validate that providerId is a UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(providerId)) {
        logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Invalid provider ID format.');
        return NextResponse.json({ error: 'Invalid Provider ID format.' }, { status: 400 });
    }

    try {
        body = await request.json() as UpdateProviderRequestBody;
    } catch (e) {
        logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Invalid JSON in request body for PUT.');
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
    }

    const { provider_name, report_sender_email, parser_strategy } = body;

    // Ensure at least one field is being updated
    if (!provider_name && !report_sender_email && !parser_strategy) {
        logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]`, body }, 'No fields provided for update.');
        return NextResponse.json({ error: 'No fields provided for update. At least one field (provider_name, report_sender_email, or parser_strategy) must be supplied.' }, { status: 400 });
    }
    
    // Validate email format if provided
    if (report_sender_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(report_sender_email)) {
            logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]`, email: report_sender_email }, 'Invalid email format for report_sender_email.');
            return NextResponse.json({ error: 'Invalid email format for report_sender_email.' }, { status: 400 });
        }
    }


    // Construct the update object dynamically to only include provided fields
    const updateData: { [key: string]: any } = {};
    if (provider_name !== undefined) updateData.provider_name = provider_name;
    if (report_sender_email !== undefined) updateData.report_sender_email = report_sender_email;
    if (parser_strategy !== undefined) updateData.parser_strategy = parser_strategy;
    updateData.updated_at = new Date().toISOString(); // Manually update timestamp as RLS bypasses trigger sometimes

    try {
        const { data, error, count } = await supabase
            .from('user_daycare_providers')
            .update(updateData)
            .eq('id', providerId)
            .eq('user_id', userId) // RLS policy will also enforce this
            .select()
            .single();

        if (error) {
             // Check for unique constraint violation (user_id, report_sender_email)
            if (error.code === '23505') { 
                logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]`, body, error: error.message }, 'Attempted to update to a duplicate provider configuration.');
                return NextResponse.json({ error: 'Another provider configuration with this sender email already exists.' }, { status: 409 }); // 409 Conflict
            }
            logger.error({ userId, providerId, route: `/api/user-daycare-providers/[id]`, error: error.message }, 'Error updating provider in Supabase.');
            return NextResponse.json({ error: 'Failed to update provider configuration.' }, { status: 500 });
        }
        
        if (count === 0) {
            logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Provider not found or user does not have permission to update.');
            return NextResponse.json({ error: 'Provider configuration not found or update not permitted.' }, { status: 404 });
        }

        logger.info({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Successfully updated provider configuration.');
        return NextResponse.json(data);
    } catch (e: any) {
        logger.error({ userId, providerId, route: `/api/user-daycare-providers/[id]`, error: e.message }, 'Unexpected error updating provider.');
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
};

/**
 * DELETE /api/user-daycare-providers/[id]
 * Deletes a daycare provider configuration for the authenticated user.
 */
const deleteProviderHandler = async (request: NextRequest, session: Session, context: RouteContext) => {
    const userId = session.user.id;
    const { id: providerId } = context.params;

    if (!providerId) {
        logger.warn({ userId, route: `/api/user-daycare-providers/[id]` }, 'Missing provider ID in request path for DELETE.');
        return NextResponse.json({ error: 'Provider ID is required.' }, { status: 400 });
    }

    // Validate that providerId is a UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(providerId)) {
        logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Invalid provider ID format for DELETE.');
        return NextResponse.json({ error: 'Invalid Provider ID format.' }, { status: 400 });
    }

    try {
        const { error, count } = await supabase
            .from('user_daycare_providers')
            .delete()
            .eq('id', providerId)
            .eq('user_id', userId); // RLS policy will also enforce this

        if (error) {
            logger.error({ userId, providerId, route: `/api/user-daycare-providers/[id]`, error: error.message }, 'Error deleting provider in Supabase.');
            return NextResponse.json({ error: 'Failed to delete provider configuration.' }, { status: 500 });
        }

        if (count === 0) {
            logger.warn({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Provider not found or user does not have permission to delete.');
            return NextResponse.json({ error: 'Provider configuration not found or delete not permitted.' }, { status: 404 });
        }

        logger.info({ userId, providerId, route: `/api/user-daycare-providers/[id]` }, 'Successfully deleted provider configuration.');
        return NextResponse.json({ message: 'Provider configuration deleted successfully.' }, { status: 200 }); // Or 204 No Content
    } catch (e: any) {
        logger.error({ userId, providerId, route: `/api/user-daycare-providers/[id]`, error: e.message }, 'Unexpected error deleting provider.');
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
};

// Export wrapped handlers
// Note: The context parameter is automatically passed by withApiHandler if the route is dynamic.
export const PUT = withApiHandler(updateProviderHandler);
export const DELETE = withApiHandler(deleteProviderHandler);
