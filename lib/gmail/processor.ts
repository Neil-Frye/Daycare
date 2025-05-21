import { google, gmail_v1 } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types'; // Adjust path as needed
import pino from 'pino';
import logger from '@/lib/logger'; // Main logger
import {
    base64UrlDecode,
    findHtmlPart,
    parseTadpolesReport,
    parseGoddardViaTadpolesReport, // Import the Goddard parser
    parseMontessoriReport,      // Import the Montessori placeholder parser
    formatTime,
    type ParsedReport,
    type ReportParser
} from './parser';

// Define possible outcomes for processing a single message
export enum ProcessMessageStatus {
    Success = 'SUCCESS',
    SkippedExists = 'SKIPPED_EXISTS',
    SkippedChildNotFound = 'SKIPPED_CHILD_NOT_FOUND',
    SkippedInvalidData = 'SKIPPED_INVALID_DATA',
    SkippedNoParserFound = 'SKIPPED_NO_PARSER_FOUND',
    Error = 'ERROR',
}

export interface ProcessMessageResult {
    status: ProcessMessageStatus;
    messageId: string;
    error?: string;
}

// Define the structure for user provider configurations needed by the dispatcher
export interface UserDaycareProviderConfig {
    report_sender_email: string;
    parser_strategy?: string | null;
    provider_name?: string | null; // Added provider_name for fallback logic
}

/**
 * Determines the appropriate parser function based on the sender's email and user's provider configurations.
 */
export function getParserForProvider(
    messageFromEmail: string,
    userProviderConfigs: UserDaycareProviderConfig[],
    loggerInstance: pino.Logger // Accept a pino logger instance
): ReportParser | null {
    const logContext = { function: 'getParserForProvider', messageFromEmail };
    loggerInstance.debug(logContext, "Attempting to find parser for provider.");

    const lowerMessageFromEmail = messageFromEmail.toLowerCase();
    let matchedConfig: UserDaycareProviderConfig | null = null;

    // First, try to find a direct match based on configured report_sender_email
    for (const config of userProviderConfigs) {
        const lowerConfigEmail = config.report_sender_email.toLowerCase();
        let emailMatch = false;
        if (lowerConfigEmail.startsWith('@')) { // Domain match
            if (lowerMessageFromEmail.endsWith(lowerConfigEmail)) {
                emailMatch = true;
            }
        } else { // Exact email match
            if (lowerMessageFromEmail === lowerConfigEmail) {
                emailMatch = true;
            }
        }

        if (emailMatch) {
            matchedConfig = config;
            loggerInstance.info({ ...logContext, matchedConfig }, "Found matching provider configuration by email.");
            break;
        }
    }

    // If a configuration is matched by email, use its parser_strategy or infer
    if (matchedConfig) {
        if (matchedConfig.parser_strategy) {
            switch (matchedConfig.parser_strategy) {
                case 'tadpoles_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Tadpoles v1 parser based on strategy field.");
                    return parseTadpolesReport;
                case 'goddard_tadpoles_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Goddard (via Tadpoles) v1 parser based on strategy field.");
                    return parseGoddardViaTadpolesReport;
                case 'montessori_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Montessori v1 parser based on strategy field.");
                    return parseMontessoriReport;
                default:
                    loggerInstance.warn({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Unknown parser_strategy defined in matched config. Will attempt inference based on email and provider name.");
                    // Fall through to inference if strategy is unknown
            }
        }
        // If no explicit strategy, try to infer from email and provider name
        if (lowerMessageFromEmail.includes('@tadpoles.com')) {
            if (matchedConfig.provider_name?.toLowerCase().includes('goddard')) {
                 loggerInstance.info({ ...logContext, providerName: matchedConfig.provider_name }, "Inferred Goddard (via Tadpoles) parser based on sender email domain and provider name (no explicit strategy).");
                 return parseGoddardViaTadpolesReport;
            }
            loggerInstance.info({ ...logContext, providerName: matchedConfig.provider_name }, "Inferred Tadpoles parser based on sender email domain (no explicit strategy, or name not Goddard).");
            return parseTadpolesReport;
        }
        loggerInstance.warn({ ...logContext, matchedConfigEmail: matchedConfig.report_sender_email, providerName: matchedConfig.provider_name }, "Matched email in config, but no parser strategy resolved or inferred. Cannot select parser for this config.");
        return null;
    }

    // Fallback: No direct email match in configs. Try to infer based on common patterns and provider_name for any config.
    loggerInstance.info({ ...logContext }, "No direct email match in configs. Attempting fallback based on provider_name and sender email patterns across all configs.");
    for (const config of userProviderConfigs) {
        const lowerProviderName = config.provider_name?.toLowerCase();
        if (lowerProviderName?.includes('goddard') && lowerMessageFromEmail.includes('@tadpoles.com')) {
            loggerInstance.info({ ...logContext, providerName: config.provider_name }, "Fallback: Matched 'Goddard' in a provider name and Tadpoles email. Using Goddard parser.");
            return parseGoddardViaTadpolesReport;
        }
        if (lowerProviderName?.includes('tadpoles') && lowerMessageFromEmail.includes('@tadpoles.com')) { // Generic tadpoles fallback
            loggerInstance.info({ ...logContext, providerName: config.provider_name }, "Fallback: Matched 'Tadpoles' in a provider name and Tadpoles email. Using Tadpoles parser.");
            return parseTadpolesReport;
        }
        // Example for Montessori - requires knowing its email pattern
        // if (lowerProviderName?.includes('montessori') && lowerMessageFromEmail.includes('@montessori-example.com')) {
        //    loggerInstance.info({ ...logContext, providerName: config.provider_name }, "Fallback: Matched 'Montessori' in provider name and example email. Using Montessori parser.");
        //    return parseMontessoriReport;
        // }
    }

    loggerInstance.info({ ...logContext }, "No matching provider configuration or fallback pattern found for this sender email.");
    return null;
}


/**
 * Processes a single Gmail message: fetches, parses, and saves the report data to Supabase.
 */
export async function processGmailMessage(
    gmail: gmail_v1.Gmail,
    supabase: SupabaseClient<Database>,
    messageId: string,
    userId: string,
    userProviderConfigs: UserDaycareProviderConfig[]
): Promise<ProcessMessageResult> {
    // Use the global logger for the main function, pass it to sub-functions
    const childLogger = logger.child({ gmailMessageId: messageId, userId });
    const logContext = { gmailMessageId: messageId, userId }; // Keep for top-level logging if needed before childLogger takes over

    let senderEmail: string | null = null;
    try {
        const messageResponseForHeaders = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['From']
        });
        const fromHeader = messageResponseForHeaders.data.payload?.headers?.find(h => h.name === 'From');
        if (fromHeader?.value) {
            const match = fromHeader.value.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (match) {
                senderEmail = match[0].toLowerCase();
            }
        }
    } catch (err: any) {
        childLogger.error({ err: err.message }, "Failed to fetch message headers or extract sender email.");
        return { status: ProcessMessageStatus.Error, messageId, error: "Failed to fetch message headers." };
    }


    if (!senderEmail) {
        childLogger.warn("Could not extract sender email from 'From' header.");
        return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Could not extract sender email." };
    }
    // Update childLogger context with senderEmail
    childLogger.child({ senderEmail }); 

    const parser = getParserForProvider(senderEmail, userProviderConfigs, childLogger);

    if (!parser) {
        childLogger.warn("No suitable parser found for this sender's email and user configuration. Skipping message.");
        return { status: ProcessMessageStatus.SkippedNoParserFound, messageId, error: `No parser found for sender: ${senderEmail}` };
    }

    try {
        const { data: existingReport, error: checkError } = await supabase
            .from('daily_reports')
            .select('id', { count: 'exact', head: true })
            .eq('gmail_message_id', messageId)
            .maybeSingle();

        if (checkError) {
            childLogger.error({ err: checkError.message }, "Error checking for existing report");
            throw checkError;
        }
        if (existingReport) {
            childLogger.info("Skipping already processed message");
            return { status: ProcessMessageStatus.SkippedExists, messageId };
        }

        childLogger.debug("Fetching full Gmail message");
        const messageResponse = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
        const messageData = messageResponse.data;
        const payload = messageData.payload;

        let htmlContent = '';
        if (payload?.mimeType === 'text/html' && payload.body?.data) {
            htmlContent = base64UrlDecode(payload.body.data);
        } else {
            const htmlPart = findHtmlPart(payload?.parts);
            if (htmlPart?.body?.data) {
                htmlContent = base64UrlDecode(htmlPart.body.data);
            }
        }

        if (!htmlContent) {
            childLogger.warn("Could not find or decode HTML body for message");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "No HTML content found" };
        }

        childLogger.debug("Parsing HTML content with selected parser");
        const reportData = parser(htmlContent, childLogger);

        if (!reportData) {
            childLogger.warn("Parser returned null (failed to parse). Skipping message.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Failed to parse report data." };
        }
        
        if (!reportData.childName) { 
             childLogger.warn("Child name not found in parsed report after using selected parser. Skipping.");
             return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Child name missing in parsed report" };
        }
        childLogger.debug({ parsedChildName: reportData.childName }, "Looking up child ID");
        const { data: childData, error: childError } = await supabase
            .from('children')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', `%${reportData.childName}%`)
            .maybeSingle();

        if (childError) {
            childLogger.error({ err: childError.message }, "Error looking up child ID");
            throw childError;
        }
        if (!childData) {
            childLogger.warn({ parsedChildName: reportData.childName }, "Child not found for user. Skipping report.");
            return { status: ProcessMessageStatus.SkippedChildNotFound, messageId, error: `Child matching '${reportData.childName}' not found` };
        }
        const childId = childData.id;
        childLogger.debug({ childId }, "Found matching child ID");

        let reportDate: string | null = null;
        try {
            const parsedDate = new Date(reportData.reportDate);
            if (!isNaN(parsedDate.getTime())) {
                reportDate = parsedDate.toISOString().split('T')[0];
            }
        } catch (dateError: any) {
             childLogger.warn({ rawDate: reportData.reportDate, err: dateError.message }, "Failed to parse report date string");
        }

        if (!reportDate) {
            childLogger.warn({ rawDate: reportData.reportDate }, "Invalid or unparseable report date. Skipping report.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: `Invalid report date: ${reportData.reportDate}` };
        }
        childLogger.debug({ reportDate }, "Formatted report date");

        childLogger.debug({ childId, reportDate }, "Upserting daily report");
        const { data: upsertedReport, error: reportError } = await supabase
            .from('daily_reports')
            .upsert({
                child_id: childId,
                date: reportDate,
                teacher_notes: reportData.teacherNotes,
                gmail_message_id: messageId,
                child_name_from_report: reportData.childName,
                report_date_from_report: reportData.reportDate,
            }, { onConflict: 'gmail_message_id', ignoreDuplicates: false })
            .select('id')
            .single();

        if (reportError) {
             childLogger.error({ err: reportError.message }, "Error upserting daily report");
             throw reportError;
        }
        if (!upsertedReport) {
             childLogger.error("Upsert operation did not return the report ID.");
             throw new Error('Failed to upsert daily report or retrieve its ID.');
        }
        const reportId = upsertedReport.id;
        childLogger.info({ reportId }, "Successfully upserted daily report");

        const insertPromises = [];

        if (reportData.naps.length > 0) {
            const napInserts = reportData.naps.map(nap => ({
                report_id: reportId,
                start_time: formatTime(nap.startTime),
                end_time: formatTime(nap.endTime),
                duration_text: nap.durationText,
            }));
            insertPromises.push(
                supabase.from('naps').insert(napInserts)
                    .then(({ error }) => {
                        if (error) childLogger.error({ reportId, err: error.message }, "Error inserting naps");
                        else childLogger.debug({ reportId, count: napInserts.length }, "Inserted naps");
                    })
            );
        }
         if (reportData.meals.length > 0) {
            const mealInserts = reportData.meals.map(meal => ({
                report_id: reportId,
                meal_time: formatTime(meal.time),
                food_description: meal.food,
                details: meal.details,
                initials: meal.initials,
            }));
            insertPromises.push(
                supabase.from('meals').insert(mealInserts)
                    .then(({ error }) => {
                        if (error) childLogger.error({ reportId, err: error.message }, "Error inserting meals");
                         else childLogger.debug({ reportId, count: mealInserts.length }, "Inserted meals");
                    })
            );
        }

        if (reportData.bathroomEvents.length > 0) {
            const bathroomInserts = reportData.bathroomEvents.map(event => ({
                report_id: reportId,
                event_time: formatTime(event.time),
                event_type: event.type,
                status: event.status,
                initials: event.initials,
            }));
            insertPromises.push(
                supabase.from('bathroom_events').insert(bathroomInserts)
                    .then(({ error }) => {
                        if (error) childLogger.error({ reportId, err: error.message }, "Error inserting bathroom events");
                         else childLogger.debug({ reportId, count: bathroomInserts.length }, "Inserted bathroom events");
                    })
            );
        }

        if (reportData.activities.length > 0) {
            const activityInserts = reportData.activities.map(activity => ({
                report_id: reportId,
                description: activity.description,
            }));
            insertPromises.push(
                supabase.from('activities').insert(activityInserts)
                    .then(({ error }) => {
                        if (error) childLogger.error({ reportId, err: error.message }, "Error inserting activities");
                         else childLogger.debug({ reportId, count: activityInserts.length }, "Inserted activities");
                    })
            );
        }

         if (reportData.photos.length > 0) {
            const photoInserts = reportData.photos.map(photo => ({
                report_id: reportId,
                image_url: photo.src,
                description: photo.description,
                date: reportDate,
                child_id: childId,
            }));
             insertPromises.push(
                supabase.from('photos').insert(photoInserts)
                    .then(({ error }) => {
                        if (error) childLogger.error({ reportId, err: error.message }, "Error inserting photos");
                         else childLogger.debug({ reportId, count: photoInserts.length }, "Inserted photos");
                    })
            );
        }

        await Promise.allSettled(insertPromises);

        return { status: ProcessMessageStatus.Success, messageId };

    } catch (error: any) {
        childLogger.error({ err: error.message || String(error) }, `Unhandled error processing message`);
        return { status: ProcessMessageStatus.Error, messageId, error: error.message || 'Unknown processing error' };
    }
}
