import { google, gmail_v1 } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types'; // Adjust path as needed
import pino from 'pino';
import logger from '@/lib/logger'; // Main logger
import {
    base64UrlDecode,
    findHtmlPart,
    parseTadpolesReport,
    parseGoddardViaTadpolesReport,
    parseMontessoriReport,
    formatTime,
    type ParsedReport,
    type ReportParser,
    // Removed individual parsed type imports as they are now part of ParsedReport or handled in payload construction
} from './parser';

// Define possible outcomes for processing a single message
export enum ProcessMessageStatus {
    Success = 'SUCCESS',
    SkippedExists = 'SKIPPED_EXISTS',
    SkippedChildNotFound = 'SKIPPED_CHILD_NOT_FOUND',
    SkippedInvalidData = 'SKIPPED_INVALID_DATA',
    SkippedNoParserFound = 'SKIPPED_NO_PARSER_FOUND',
    SkippedAmbiguousChildMatch = 'SKIPPED_AMBIGUOUS_CHILD_MATCH', // New status
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
    provider_name?: string | null;
}

/**
 * Determines the appropriate parser function based on the sender's email and user's provider configurations.
 */
export function getParserForProvider(
    messageFromEmail: string,
    userProviderConfigs: UserDaycareProviderConfig[],
    loggerInstance: pino.Logger
): ReportParser | null {
    const logContext = { function: 'getParserForProvider', messageFromEmail };
    loggerInstance.debug(logContext, "Attempting to find parser for provider.");

    const lowerMessageFromEmail = messageFromEmail.toLowerCase();
    let matchedConfig: UserDaycareProviderConfig | null = null;

    for (const config of userProviderConfigs) {
        const lowerConfigEmail = config.report_sender_email.toLowerCase();
        let emailMatch = false;
        if (lowerConfigEmail.startsWith('@')) {
            if (lowerMessageFromEmail.endsWith(lowerConfigEmail)) emailMatch = true;
        } else {
            if (lowerMessageFromEmail === lowerConfigEmail) emailMatch = true;
        }
        if (emailMatch) {
            matchedConfig = config;
            loggerInstance.info({ ...logContext, matchedConfig }, "Found matching provider configuration by email.");
            break;
        }
    }

    if (matchedConfig) {
        if (matchedConfig.parser_strategy) {
            switch (matchedConfig.parser_strategy) {
                case 'tadpoles_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Tadpoles v1 parser.");
                    return parseTadpolesReport;
                case 'goddard_tadpoles_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Goddard (via Tadpoles) v1 parser.");
                    return parseGoddardViaTadpolesReport;
                case 'montessori_v1':
                    loggerInstance.info({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Using Montessori v1 parser.");
                    return parseMontessoriReport;
                default:
                    loggerInstance.warn({ ...logContext, strategy: matchedConfig.parser_strategy, providerName: matchedConfig.provider_name }, "Unknown parser_strategy. Will attempt inference.");
            }
        }
        if (lowerMessageFromEmail.includes('@tadpoles.com')) {
            if (matchedConfig.provider_name?.toLowerCase().includes('goddard')) {
                 loggerInstance.info({ ...logContext, providerName: matchedConfig.provider_name }, "Inferred Goddard parser (Tadpoles email, Goddard name).");
                 return parseGoddardViaTadpolesReport;
            }
            loggerInstance.info({ ...logContext, providerName: matchedConfig.provider_name }, "Inferred Tadpoles parser (Tadpoles email).");
            return parseTadpolesReport;
        }
        loggerInstance.warn({ ...logContext, matchedConfigEmail: matchedConfig.report_sender_email, providerName: matchedConfig.provider_name }, "Matched email, but no strategy resolved/inferred.");
        return null;
    }

    loggerInstance.info({ ...logContext }, "No direct email match. Attempting fallback.");
    for (const config of userProviderConfigs) {
        const lowerProviderName = config.provider_name?.toLowerCase();
        if (lowerProviderName?.includes('goddard') && lowerMessageFromEmail.includes('@tadpoles.com')) {
            loggerInstance.info({ ...logContext, providerName: config.provider_name }, "Fallback: Goddard parser (Goddard name, Tadpoles email).");
            return parseGoddardViaTadpolesReport;
        }
        if (lowerProviderName?.includes('tadpoles') && lowerMessageFromEmail.includes('@tadpoles.com')) {
            loggerInstance.info({ ...logContext, providerName: config.provider_name }, "Fallback: Tadpoles parser (Tadpoles name, Tadpoles email).");
            return parseTadpolesReport;
        }
    }

    loggerInstance.info({ ...logContext }, "No parser found after all checks.");
    return null;
}


/**
 * Processes a single Gmail message: fetches, parses, and saves the report data to Supabase
 * by calling a stored procedure.
 */
export async function processGmailMessage(
    gmail: gmail_v1.Gmail,
    supabase: SupabaseClient<Database>,
    messageId: string,
    userId: string,
    userProviderConfigs: UserDaycareProviderConfig[]
): Promise<ProcessMessageResult> {
    const childLogger = logger.child({ gmailMessageId: messageId, userId });

    let senderEmail: string | null = null;
    try {
        const messageResponseForHeaders = await gmail.users.messages.get({
            userId: 'me', id: messageId, format: 'metadata', metadataHeaders: ['From']
        });
        const fromHeader = messageResponseForHeaders.data.payload?.headers?.find(h => h.name === 'From');
        if (fromHeader?.value) {
            const match = fromHeader.value.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (match) senderEmail = match[0].toLowerCase();
        }
    } catch (err: any) {
        childLogger.error({ err: err.message }, "Failed to fetch message headers.");
        return { status: ProcessMessageStatus.Error, messageId, error: "Failed to fetch message headers." };
    }

    if (!senderEmail) {
        childLogger.warn("Could not extract sender email from 'From' header.");
        return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Could not extract sender email." };
    }
    const currentLogger = childLogger.child({ senderEmail });

    const parser = getParserForProvider(senderEmail, userProviderConfigs, currentLogger);
    if (!parser) {
        currentLogger.warn("No suitable parser found. Skipping message.");
        return { status: ProcessMessageStatus.SkippedNoParserFound, messageId, error: `No parser found for sender: ${senderEmail}` };
    }

    try {
        // Check if the report already exists (based on raw_email_id)
        const { data: existingReport, error: checkError } = await supabase
            .from('daily_reports')
            .select('id', { count: 'exact', head: true })
            .eq('raw_email_id', messageId)
            .maybeSingle();

        if (checkError) {
            currentLogger.error({ err: checkError.message }, "Error checking for existing report");
            throw checkError; // Propagate to main catch block
        }
        if (existingReport) {
            currentLogger.info("Skipping already processed message (found by raw_email_id).");
            return { status: ProcessMessageStatus.SkippedExists, messageId };
        }

        currentLogger.debug("Fetching full Gmail message");
        const messageResponse = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
        const payload = messageResponse.data.payload;

        let htmlContent = '';
        if (payload?.mimeType === 'text/html' && payload.body?.data) {
            htmlContent = base64UrlDecode(payload.body.data);
        } else {
            const htmlPart = findHtmlPart(payload?.parts);
            if (htmlPart?.body?.data) htmlContent = base64UrlDecode(htmlPart.body.data);
        }

        if (!htmlContent) {
            currentLogger.warn("No HTML content found in message.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "No HTML content found" };
        }

        currentLogger.debug("Parsing HTML content with selected parser");
        const reportData = parser(htmlContent, currentLogger);

        if (!reportData) {
            currentLogger.warn("Parser returned null. Skipping message.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Failed to parse report data." };
        }
        
        if (!reportData.childName) {
            currentLogger.warn("Child name missing in parsed report. Skipping.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Child name missing in parsed report" };
        }

        let childId: string | null = null;
        const parsedChildName = reportData.childName;
        currentLogger.debug({ parsedChildName }, "Attempting to match child ID.");

        // Pass 1: Exact Match on first_name
        currentLogger.debug({ parsedChildName }, "Attempting exact match for child's first name.");
        const { data: exactChildData, error: exactChildError } = await supabase
            .from('children')
            .select('id, first_name, last_name') // Select names for logging
            .eq('user_id', userId)
            .eq('first_name', parsedChildName) // Case-sensitive exact match on first_name
            .maybeSingle();

        if (exactChildError) {
            currentLogger.error({ err: exactChildError.message, parsedChildName }, "Error during exact child match query. Proceeding to inexact match.");
            // Not returning, will proceed to ilike match
        } else if (exactChildData) {
            childId = exactChildData.id;
            currentLogger.info({ childId, childName: `${exactChildData.first_name} ${exactChildData.last_name || ''}`.trim(), matchType: 'exact' }, "Found child by exact match on first name.");
        }

        // Pass 2: Case-Insensitive Partial Match on first_name (Fallback)
        if (!childId) {
            currentLogger.debug({ parsedChildName }, "Exact match not found. Attempting case-insensitive partial match for child's first name.");
            const { data: ilikeChildrenData, error: ilikeChildError } = await supabase
                .from('children')
                .select('id, first_name, last_name') // Fetch names for logging
                .eq('user_id', userId)
                .ilike('first_name', `%${parsedChildName}%`); // Case-insensitive partial match on first_name

            if (ilikeChildError) {
                currentLogger.error({ err: ilikeChildError.message, parsedChildName }, "Error during case-insensitive partial child match query.");
                return { status: ProcessMessageStatus.Error, messageId, error: "Database error during child lookup." };
            }

            if (!ilikeChildrenData || ilikeChildrenData.length === 0) {
                currentLogger.warn({ parsedChildName }, "No child found by exact or case-insensitive partial match on first name. Skipping report.");
                return { status: ProcessMessageStatus.SkippedChildNotFound, messageId, error: `No child found matching '${parsedChildName}'` };
            }

            if (ilikeChildrenData.length === 1) {
                childId = ilikeChildrenData[0].id;
                currentLogger.info({ childId, childName: `${ilikeChildrenData[0].first_name} ${ilikeChildrenData[0].last_name || ''}`.trim(), matchType: 'ilike-single' }, "Found single child by case-insensitive partial match on first name.");
            } else {
                // Multiple partial matches found
                const ambiguousMatches = ilikeChildrenData.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name || ''}`.trim() }));
                currentLogger.warn({ parsedChildName, matches: ambiguousMatches }, "Ambiguous child match: Multiple children found with similar first names. Skipping report.");
                return { status: ProcessMessageStatus.SkippedAmbiguousChildMatch, messageId, error: `Ambiguous child match for '${parsedChildName}'. Found: ${ambiguousMatches.map(m => m.name).join(', ')}` };
            }
        }
        
        if (!childId) {
             // This case should ideally not be reached if the logic above is correct, but as a safeguard:
             currentLogger.error({ parsedChildName }, "Child ID could not be determined after matching logic. This indicates a flaw in the matching process.");
             return { status: ProcessMessageStatus.SkippedChildNotFound, messageId, error: `Child ID determination failed for '${parsedChildName}'` };
        }
        currentLogger.debug({ childId, parsedChildName }, "Successfully matched child ID.");

        let reportDate: string | null = null;
        try {
            const parsedDate = new Date(reportData.reportDate);
            if (!isNaN(parsedDate.getTime())) reportDate = parsedDate.toISOString().split('T')[0];
        } catch (dateError: any) {
             currentLogger.warn({ rawDate: reportData.reportDate, err: dateError.message }, "Failed to parse report date string");
        }

        if (!reportDate) {
            currentLogger.warn({ rawDate: reportData.reportDate }, "Invalid report date. Skipping report.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: `Invalid report date: ${reportData.reportDate}` };
        }
        currentLogger.debug({ reportDate }, "Formatted report date");

        // Prepare the JSONB payload for the SQL function
        const reportPayload = {
            child_id: childId,
            report_date: reportDate,
            teacher_notes: reportData.teacherNotes,
            raw_email_id: messageId,
            parent_notes: null, // Current parsers don't extract this
            
            naps_data: reportData.naps?.map(nap => ({
                start_time: formatTime(nap.startTime),
                end_time: formatTime(nap.endTime),
                duration_text: nap.durationText,
            })) || [],
            
            meals_data: reportData.meals?.map(meal => ({
                meal_time: meal.time ? `${reportDate} ${formatTime(meal.time)}` : null,
                description: `${meal.food}${meal.details ? ` (${meal.details})` : ''}${meal.initials ? ` [${meal.initials.join(', ')}]` : ''}`.trim(),
                amount: null, // Parser doesn't provide specific amount
            })) || [],
            
            bathroom_events_data: reportData.bathroomEvents?.map(event => ({
                event_time: event.time ? `${reportDate} ${formatTime(event.time)}` : null,
                event_type: event.type,
                status: event.status,
                initials: event.initials || [], // Ensure it's an array for JSONB
            })) || [],
            
            activities_data: reportData.activities?.map(activity => ({
                activity_time: null, // Parser doesn't provide specific time
                description: activity.description,
                categories: null, // Parser doesn't provide this structured
                goals: null,      // Parser doesn't provide this structured
            })) || [],
            
            photos_data: reportData.photos?.map(photo => {
                let sourceDomain = null;
                try {
                    if (photo.src) sourceDomain = new URL(photo.src).hostname;
                } catch (e) { /* ignore invalid URL */ }
                return {
                    image_url: photo.src,
                    thumbnail_url: null, // Parser doesn't provide specific thumbnail
                    source_domain: sourceDomain,
                    description: photo.description,
                };
            }) || [],
        };

        currentLogger.info({ reportPayloadSize: JSON.stringify(reportPayload).length }, "Calling process_parsed_email_report RPC");
        const { data: rpcData, error: rpcError } = await supabase.rpc(
            'process_parsed_email_report',
            { p_report_data: reportPayload }
        );

        if (rpcError) {
            currentLogger.error({ err: rpcError, details: rpcError.details, hint: rpcError.hint }, "Error calling process_parsed_email_report RPC");
            return { status: ProcessMessageStatus.Error, messageId, error: `RPC Error: ${rpcError.message}` };
        }

        currentLogger.info({ newReportId: rpcData }, "Successfully processed report via RPC.");
        return { status: ProcessMessageStatus.Success, messageId };

    } catch (error: any) {
        currentLogger.error({ err: error.message || String(error) }, `Unhandled error in processGmailMessage`);
        return { status: ProcessMessageStatus.Error, messageId, error: error.message || 'Unknown processing error' };
    }
}
