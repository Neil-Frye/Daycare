import { google, gmail_v1 } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types'; // Adjust path as needed
import logger from '@/lib/logger';
import {
    base64UrlDecode,
    findHtmlPart,
    parseReportData,
    formatTime,
    type ParsedReport
} from './parser'; // Import parser functions

// Define possible outcomes for processing a single message
export enum ProcessMessageStatus {
    Success = 'SUCCESS',
    SkippedExists = 'SKIPPED_EXISTS',
    SkippedChildNotFound = 'SKIPPED_CHILD_NOT_FOUND',
    SkippedInvalidData = 'SKIPPED_INVALID_DATA', // e.g., invalid date, no HTML
    Error = 'ERROR',
}

export interface ProcessMessageResult {
    status: ProcessMessageStatus;
    messageId: string;
    error?: string; // Include error message on failure
}

/**
 * Processes a single Gmail message: fetches, parses, and saves the report data to Supabase.
 *
 * @param gmail Gmail API client instance.
 * @param supabase Supabase client instance.
 * @param messageId The ID of the Gmail message to process.
 * @param userId The ID of the user owning the report.
 * @returns {Promise<ProcessMessageResult>} An object indicating the outcome.
 */
export async function processGmailMessage(
    gmail: gmail_v1.Gmail,
    supabase: SupabaseClient<Database>,
    messageId: string,
    userId: string
): Promise<ProcessMessageResult> {
    const logContext = { gmailMessageId: messageId, userId };

    try {
        // 1. Check if message already processed
        const { data: existingReport, error: checkError } = await supabase
            .from('daily_reports')
            .select('id', { count: 'exact', head: true }) // More efficient check
            .eq('gmail_message_id', messageId)
            .maybeSingle(); // Check if it exists at all

        if (checkError) {
            logger.error({ ...logContext, err: checkError }, "Error checking for existing report");
            throw checkError; // Propagate Supabase errors
        }
        if (existingReport) {
            logger.info(logContext, "Skipping already processed message");
            return { status: ProcessMessageStatus.SkippedExists, messageId };
        }

        // 2. Fetch full message
        logger.debug(logContext, "Fetching full Gmail message");
        const messageResponse = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
        const messageData = messageResponse.data;
        const payload = messageData.payload;

        // 3. Find and decode HTML part
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
            logger.warn(logContext, "Could not find or decode HTML body for message");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "No HTML content found" };
        }

        // 4. Parse HTML content
        logger.debug(logContext, "Parsing HTML content");
        const reportData: ParsedReport = parseReportData(htmlContent);

        // 5. Find child_id based on parsed name and user_id
        if (!reportData.childName) {
             logger.warn(logContext, "Child name not found in parsed report. Skipping.");
             return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: "Child name missing in report" };
        }
        logger.debug({ ...logContext, parsedChildName: reportData.childName }, "Looking up child ID");
        const { data: childData, error: childError } = await supabase
            .from('children')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', `%${reportData.childName}%`) // Case-insensitive partial match
            .maybeSingle();

        if (childError) {
            logger.error({ ...logContext, err: childError }, "Error looking up child ID");
            throw childError;
        }
        if (!childData) {
            logger.warn({ ...logContext, parsedChildName: reportData.childName }, "Child not found for user. Skipping report.");
            return { status: ProcessMessageStatus.SkippedChildNotFound, messageId, error: `Child matching '${reportData.childName}' not found` };
        }
        const childId = childData.id;
        logger.debug({ ...logContext, childId }, "Found matching child ID");

        // 6. Format and validate report date
        let reportDate: string | null = null;
        try {
            const parsedDate = new Date(reportData.reportDate);
            // Check if the parsed date is valid
            if (!isNaN(parsedDate.getTime())) {
                reportDate = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
        } catch (dateError) {
             logger.warn({ ...logContext, rawDate: reportData.reportDate, err: dateError }, "Failed to parse report date string");
        }

        if (!reportDate) {
            logger.warn({ ...logContext, rawDate: reportData.reportDate }, "Invalid or unparseable report date. Skipping report.");
            return { status: ProcessMessageStatus.SkippedInvalidData, messageId, error: `Invalid report date: ${reportData.reportDate}` };
        }
        logger.debug({ ...logContext, reportDate }, "Formatted report date");

        // 7. Upsert Daily Report
        logger.debug({ ...logContext, childId, reportDate }, "Upserting daily report");
        const { data: upsertedReport, error: reportError } = await supabase
            .from('daily_reports')
            .upsert({
                child_id: childId,
                date: reportDate,
                teacher_notes: reportData.teacherNotes,
                gmail_message_id: messageId,
                child_name_from_report: reportData.childName, // Store raw parsed name
                report_date_from_report: reportData.reportDate, // Store raw parsed date
            }, { onConflict: 'gmail_message_id', ignoreDuplicates: false })
            .select('id')
            .single(); // Expect one row back

        if (reportError) {
             logger.error({ ...logContext, err: reportError }, "Error upserting daily report");
             throw reportError;
        }
        if (!upsertedReport) {
             // This case might happen if ignoreDuplicates was true and it existed, but we set it to false.
             // If it still happens, it's an unexpected state.
             logger.error(logContext, "Upsert operation did not return the report ID.");
             throw new Error('Failed to upsert daily report or retrieve its ID.');
        }
        const reportId = upsertedReport.id;
        logger.info({ ...logContext, reportId }, "Successfully upserted daily report");

        // 8. Insert related data (wrap each in try/catch to allow partial success)
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
                        if (error) logger.error({ ...logContext, reportId, err: error }, "Error inserting naps");
                        else logger.debug({ ...logContext, reportId, count: napInserts.length }, "Inserted naps");
                    })
            );
        }
        // ... (Similar blocks for meals, bathroomEvents, activities, photos) ...
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
                        if (error) logger.error({ ...logContext, reportId, err: error }, "Error inserting meals");
                         else logger.debug({ ...logContext, reportId, count: mealInserts.length }, "Inserted meals");
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
                        if (error) logger.error({ ...logContext, reportId, err: error }, "Error inserting bathroom events");
                         else logger.debug({ ...logContext, reportId, count: bathroomInserts.length }, "Inserted bathroom events");
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
                        if (error) logger.error({ ...logContext, reportId, err: error }, "Error inserting activities");
                         else logger.debug({ ...logContext, reportId, count: activityInserts.length }, "Inserted activities");
                    })
            );
        }

         if (reportData.photos.length > 0) {
            const photoInserts = reportData.photos.map(photo => ({
                report_id: reportId,
                image_url: photo.src, // Assuming src is the URL
                description: photo.description,
                date: reportDate, // Add date context to photo record
                child_id: childId, // Add child_id context
            }));
             insertPromises.push(
                supabase.from('photos').insert(photoInserts)
                    .then(({ error }) => {
                        if (error) logger.error({ ...logContext, reportId, err: error }, "Error inserting photos");
                         else logger.debug({ ...logContext, reportId, count: photoInserts.length }, "Inserted photos");
                    })
            );
        }


        // Wait for all related data inserts to attempt completion
        await Promise.allSettled(insertPromises);

        return { status: ProcessMessageStatus.Success, messageId };

    } catch (error: any) {
        logger.error({ ...logContext, err: error }, `Unhandled error processing message`);
        return { status: ProcessMessageStatus.Error, messageId, error: error.message || 'Unknown processing error' };
    }
}
