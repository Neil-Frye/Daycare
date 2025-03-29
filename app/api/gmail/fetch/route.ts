import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';
import { Session } from 'next-auth';
import { supabase } from '@/lib/supabase/server'; // Use server client
import { withApiHandler } from '@/lib/api/handler'; // Import the wrapper
import { processGmailMessage, ProcessMessageStatus } from '@/lib/gmail/processor'; // Import processor
import logger from '@/lib/logger';

// Define the core logic for the GET handler
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
    // TODO: Make query and maxResults configurable?
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

    // Process each message using the centralized processor function
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

// Export the wrapped handler
// Note: The withApiHandler already handles basic authentication and generic errors.
// Specific Google API errors (like 401 due to expired token) might need explicit handling
// either within fetchGmailHandler or by enhancing withApiHandler.
export const GET = withApiHandler(fetchGmailHandler);
