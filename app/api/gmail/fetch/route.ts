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

    // List recent messages from the target sender
    // TODO: Make these configurable via environment variables:
    // - SENDER_DOMAIN: Email domain to filter messages from (e.g. @tadpoles.com)
    // - MAX_MESSAGES: Number of messages to process per request
    const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:@tadpoles.com', // Consider making domain configurable
        maxResults: 10, // Fetch a few more in case some are skipped
    });

    const messageItems = listResponse.data.messages || [];
    if (messageItems.length === 0) {
        logger.info({ userId, route: '/api/gmail/fetch' }, "No new messages found from @tadpoles.com.");
        return NextResponse.json({ message: 'No new messages found from @tadpoles.com.' });
    }

    logger.info({ userId, route: '/api/gmail/fetch', count: messageItems.length }, "Found messages to process.");

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
            return processGmailMessage(gmail, supabase, messageItem.id, userId);
        })
    );

    // Aggregate results
    let successCount = 0;
    let skippedExistsCount = 0;
    let skippedChildNotFoundCount = 0;
    let skippedInvalidDataCount = 0;
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
