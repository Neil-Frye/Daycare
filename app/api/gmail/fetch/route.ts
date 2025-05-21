import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';
import { Session } from 'next-auth';
import { supabase } from '@/lib/supabase/server'; // Use server client
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper
import { processGmailMessage, ProcessMessageStatus } from '@/lib/gmail/processor'; // Import processor
import logger from '@/lib/logger';

/**
 * Gmail Fetch API Route
 * 
 * This route handles fetching and processing daycare reports from Gmail.
 * 
 * Workflow:
 * 1. Authenticates using NextAuth session token
 * 2. Fetches recent messages from configured sender (@tadpoles.com)
 * 3. Processes each message through the Gmail processor
 * 4. Stores extracted data in Supabase
 * 5. Returns processing statistics
 * 
 * Error Handling:
 * - Missing auth tokens return 401
 * - Gmail API errors are logged and included in response
 * - Message processing errors are aggregated
 * 
 * Configuration:
 * - Currently hardcoded to fetch from @tadpoles.com
 * - Processes max 10 messages per request
 */
/**
 * Core handler for Gmail fetch requests
 * @param {NextRequest} request - Next.js request object
 * @param {Session} session - Authenticated user session
 * @returns {Promise<NextResponse>} Response with processing results
 * 
 * @throws Will throw if critical errors occur (handled by withApiHandler)
 */
const fetchGmailHandler = async (request: NextRequest, session: Session) => {
    const userId = session.user.id;
    const accessToken = session.accessToken;

    // Validate session details needed for Google API
    if (!accessToken) {
        logger.error({ userId, route: '/api/gmail/fetch' }, "Access token missing from session.");
        // Use a specific error response or rely on withApiHandler's generic 500
        return NextResponse.json({ error: 'Authentication incomplete: Access token missing.' }, { status: 401 });
    }

    // Initialize Google API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch user's configured daycare providers from Supabase
    let userProviderConfigs: any[] = []; // To store the full config objects
    let query = '';

    try {
        // Fetch all relevant fields for UserDaycareProviderConfig
        const { data: providers, error: dbError } = await supabase
            .from('user_daycare_providers')
            .select('report_sender_email, parser_strategy') // Select needed fields
            .eq('user_id', userId);

        if (dbError) {
            logger.error({ userId, route: '/api/gmail/fetch', error: dbError.message }, "Error fetching daycare providers from Supabase.");
            return NextResponse.json({ error: 'Failed to retrieve daycare provider configurations.' }, { status: 500 });
        }

        if (!providers || providers.length === 0) {
            logger.info({ userId, route: '/api/gmail/fetch' }, "No daycare providers configured for this user.");
            return NextResponse.json({ message: 'No daycare providers configured. Please add a provider in settings.' }, { status: 200 });
        }
        
        userProviderConfigs = providers; // Store the fetched configurations

        // Construct the Gmail query string dynamically from fetched providers
        const senderEmails = providers.map(p => `from:${p.report_sender_email}`);
        query = senderEmails.join(' OR ');

    } catch (e: any) {
        logger.error({ userId, route: '/api/gmail/fetch', error: e.message || String(e) }, "Unexpected error fetching daycare providers.");
        return NextResponse.json({ error: 'An unexpected error occurred while retrieving provider configurations.' }, { status: 500 });
    }
    
    logger.info({ userId, route: '/api/gmail/fetch', query, providerConfigCount: userProviderConfigs.length }, "Constructed Gmail query from user's configured providers.");

    // List recent messages from the configured senders
    // TODO: Make MAX_MESSAGES configurable via environment variables.
    const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query, // Use the dynamically constructed query
        maxResults: 10, // Fetch a few more in case some are skipped
    });

    const messageItems = listResponse.data.messages || [];
    if (messageItems.length === 0) {
        logger.info({ userId, route: '/api/gmail/fetch', query }, "No new messages found for the user's configured senders.");
        return NextResponse.json({ message: "No new messages found based on your provider configurations." });
    }

    logger.info({ userId, route: '/api/gmail/fetch', query, count: messageItems.length }, "Found messages to process.");

    /**
     * Process each message through the Gmail processor pipeline
     * 
     * The processor handles:
     * - Message content extraction
     * - Data validation
     * - Child record matching
     * - Supabase storage
     * 
     * Results are aggregated to provide detailed feedback
     */
    const processingResults = await Promise.allSettled(
        messageItems.map(messageItem => {
            if (!messageItem.id) {
                // Should not happen, but handle defensively
                logger.warn({ userId, route: '/api/gmail/fetch' }, "Found message item without ID.");
                return Promise.resolve({ status: ProcessMessageStatus.Error, messageId: 'unknown', error: 'Missing message ID' });
            }
            // Pass userProviderConfigs to processGmailMessage
            return processGmailMessage(gmail, supabase, messageItem.id, userId, userProviderConfigs);
        })
    );

    // Aggregate results
    let successCount = 0;
    let skippedExistsCount = 0;
    let skippedChildNotFoundCount = 0;
    let skippedInvalidDataCount = 0;
    let skippedNoParserFoundCount = 0; // Added for the new status
    let errorCount = 0;
    const errors: { messageId: string, error?: string }[] = [];

    processingResults.forEach(result => {
        if (result.status === 'fulfilled') {
            const data = result.value;
            switch (data.status) {
                case ProcessMessageStatus.Success:
                    successCount++;
                    break;
                case ProcessMessageStatus.SkippedExists:
                    skippedExistsCount++;
                    break;
                case ProcessMessageStatus.SkippedChildNotFound:
                    skippedChildNotFoundCount++;
                    errors.push({ messageId: data.messageId, error: data.error });
                    break;
                case ProcessMessageStatus.SkippedInvalidData:
                     skippedInvalidDataCount++;
                     errors.push({ messageId: data.messageId, error: data.error });
                     break;
                case ProcessMessageStatus.SkippedNoParserFound: // Handle new status
                    skippedNoParserFoundCount++;
                    // Optionally add to errors if you want to surface this to the user more directly
                    // errors.push({ messageId: data.messageId, error: data.error }); 
                    break;
                case ProcessMessageStatus.Error:
                    errorCount++;
                    errors.push({ messageId: data.messageId, error: data.error });
                    break;
            }
        } else {
            // Promise itself rejected - should ideally be caught within processGmailMessage
            logger.error({ userId, route: '/api/gmail/fetch', err: result.reason }, "Unexpected rejection during message processing loop.");
            errorCount++;
            errors.push({ messageId: 'unknown', error: 'Unhandled promise rejection' });
        }
    });

    const summary = {
        totalMessagesFound: messageItems.length,
        processedSuccessfully: successCount,
        skippedAlreadyExists: skippedExistsCount,
        skippedChildNotFound: skippedChildNotFoundCount,
        skippedInvalidData: skippedInvalidDataCount,
        skippedNoParserFound: skippedNoParserFoundCount, // Added to summary
        errorsEncountered: errorCount,
        errorDetails: errors // Include details for debugging on the client if needed
    };

    logger.info({ userId, route: '/api/gmail/fetch', summary }, "Finished processing Gmail messages.");

    return NextResponse.json(summary);
};

    /**
     * Wrapped GET handler
     * 
     * Uses withApiHandler middleware which provides:
     * - Session validation
     * - Error handling
     * - Logging
     * 
     * TODO: Enhance to handle:
     * - Google API token refresh
     * - Rate limiting
     * - Batch processing for large message sets
     */
export const GET = withApiHandler(fetchGmailHandler);
