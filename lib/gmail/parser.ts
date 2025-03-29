import * as cheerio from 'cheerio'; // Revert to namespace import
import { gmail_v1 } from 'googleapis';
import logger from '@/lib/logger'; // Import logger for potential parsing warnings

// --- Types --- (Define interfaces for better type safety)

export interface ParsedNap {
    durationText: string | null;
    startTime: string | null;
    endTime: string | null;
}

export interface ParsedMeal {
    time: string | null;
    food: string;
    details: string;
    initials: string[];
}

export interface ParsedBathroomEvent {
    time: string | null;
    type: string; // e.g., 'diaper'
    status: string;
    initials: string[];
}

export interface ParsedActivity {
    description: string;
}

export interface ParsedPhoto {
    src: string;
    description: string;
}

export interface ParsedReport {
    messageId?: string; // Optional, can be added later
    childName: string;
    reportDate: string; // Raw date string from report
    teacherNotes: string;
    naps: ParsedNap[];
    meals: ParsedMeal[];
    bathroomEvents: ParsedBathroomEvent[];
    activities: ParsedActivity[];
    photos: ParsedPhoto[];
}


// --- Helper Functions ---

/**
 * Decodes a base64url encoded string to UTF-8.
 * @param input The base64url encoded string.
 * @returns The decoded UTF-8 string.
 */
export function base64UrlDecode(input: string): string {
    try {
        let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
            if (pad === 1) {
                throw new Error('Invalid base64url string length.');
            }
            base64 += new Array(5 - pad).join('=');
        }
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error: any) {
        logger.error({ err: error, inputLength: input?.length }, "Failed to decode base64url string");
        throw new Error(`Failed to decode base64url: ${error.message}`);
    }
}

/**
 * Recursively finds the first HTML part within a Gmail message payload.
 * @param parts An array of message parts.
 * @returns The HTML message part or null if not found.
 */
export function findHtmlPart(parts: gmail_v1.Schema$MessagePart[] | undefined): gmail_v1.Schema$MessagePart | null {
    if (!parts) return null;
    for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
            return part;
        }
        // Recursively search in nested parts
        const nestedPart = findHtmlPart(part.parts);
        if (nestedPart) return nestedPart;
    }
    return null;
}

/**
 * Extracts text content from sibling elements starting from `startElement`
 * until an element matching `stopSelector` is encountered.
 * Used internally by parseReportData.
 */
// Using 'any' as a workaround for persistent Cheerio type issues
function getTextUntil(startElement: any, stopSelector: string, $: any): string[] {
    const texts: string[] = [];
    let currentElement = startElement.next();

    // Define common section headings that act as implicit stops
    const stopHeadings = [
        "NAPS", "MEALS", "BATHROOM", "ACTIVITIES", "SNAPSHOTS", "TODAY'S TEACHER NOTES", "PARENT NOTES"
        // Add any other known section titles here
    ];
    const stopHeadingsSelector = stopHeadings.map(h => `*:contains("${h}")`).join(', ');

    while (currentElement.length > 0) {
        // Stop if the current element itself matches the explicit stopSelector or contains a stop heading
        if (currentElement.is(stopSelector) || currentElement.find(stopSelector).length > 0 || currentElement.is(stopHeadingsSelector) || currentElement.find(stopHeadingsSelector).length > 0) {
             // Check if the startElement itself contains a stop heading text (edge case)
             const startText = startElement.text().toUpperCase();
             const isStartStopHeading = stopHeadings.some(h => startText.includes(h));
             if(!isStartStopHeading || !stopHeadings.some(h => currentElement.text().toUpperCase().includes(h))) {
                 break; // Break only if the current element is a *different* stop heading
             }
        }

        const text = currentElement.text().trim();
        if (text) {
            texts.push(text);
        }
        currentElement = currentElement.next();
    }
    return texts;
}


/**
 * Parses the HTML content of a Tadpoles daily report email.
 * @param htmlContent The HTML string.
 * @returns A ParsedReport object containing the extracted data.
 */
export function parseReportData(htmlContent: string): ParsedReport {
    const $ = cheerio.load(htmlContent);
    const report: ParsedReport = {
        childName: '', reportDate: '', teacherNotes: '',
        naps: [], meals: [], bathroomEvents: [], activities: [], photos: [],
    };

    const contentArea = $('body'); // Adjust if content is nested deeper

    // --- Child Name and Report Date ---
    // Look for "DAILY REPORT - <Date>" pattern
    const reportHeader = contentArea.find('*:contains("DAILY REPORT")').filter((i, el) => {
        return $(el).text().toUpperCase().includes('DAILY REPORT -');
    }).first();

    if (reportHeader.length) {
        const headerText = reportHeader.text();
        const dateMatch = headerText.match(/DAILY REPORT - (.*)/i); // Case-insensitive match
        report.reportDate = dateMatch ? dateMatch[1].trim() : '';

        // Try to find child name in preceding elements or parent's preceding elements
        let nameElement = reportHeader.prev();
        if (!nameElement.length || nameElement.text().trim() === '') nameElement = reportHeader.parent().prev();
        report.childName = nameElement.text().trim();
        // Add more robust name finding logic if needed
    } else {
        logger.warn("Could not find 'DAILY REPORT - <Date>' header.");
        // Fallback logic for date/name if needed
    }

    // Define a more robust selector for section headings
    const sectionHeadingsSelector = 'h1, h2, h3, h4, h5, h6, strong, b, p > font[size="+1"], div[style*="font-weight: bold"]'; // Add common bold styles

    // --- Teacher Notes ---
    const notesHeading = contentArea.find('*:contains("TODAY\'S TEACHER NOTES")').first();
    if (notesHeading.length) {
        report.teacherNotes = getTextUntil(notesHeading, sectionHeadingsSelector, $).join('\n');
    } else {
         logger.debug("Teacher Notes section not found.");
    }

    // --- Naps ---
    const napsHeading = contentArea.find('*:contains("NAPS")').first();
    if (napsHeading.length) {
        getTextUntil(napsHeading, sectionHeadingsSelector, $).forEach(text => {
            const m = text.match(/slept for (.*?) from (\d{1,2}:\d{2}\s*(?:AM|PM)?) to (\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (m) {
                report.naps.push({
                    durationText: m[1]?.trim() || null,
                    startTime: m[2]?.trim() || null,
                    endTime: m[3]?.trim() || null
                });
            }
        });
    } else {
         logger.debug("Naps section not found.");
    }

    // --- Meals ---
    const mealsHeading = contentArea.find('*:contains("MEALS")').first();
    if (mealsHeading.length) {
        getTextUntil(mealsHeading, sectionHeadingsSelector, $).forEach(text => {
            // Match "Time - Description [Optional Initials]"
            const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(.*)/);
            if (m) {
                const time = m[1]?.trim() || null;
                const details = m[2]?.trim() || '';
                // Try to extract initials (e.g., "AB," or "AB,CD") from the end
                const initialsMatch = details.match(/([A-Z,]+)$/);
                const food = initialsMatch ? details.replace(initialsMatch[0], '').trim() : details;
                const initials = initialsMatch ? initialsMatch[1].split(',').filter(Boolean) : [];
                report.meals.push({ time, food, details, initials });
            }
        });
    } else {
         logger.debug("Meals section not found.");
    }

    // --- Bathroom ---
    const bathroomHeading = contentArea.find('*:contains("BATHROOM")').first();
    if (bathroomHeading.length) {
        getTextUntil(bathroomHeading, sectionHeadingsSelector, $).forEach(text => {
            // Match "Time - diaper - Status [Optional Initials]"
            const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*diaper\s*-\s*(.*)/i); // Case-insensitive diaper
            if (m) {
                const time = m[1]?.trim() || null;
                const details = m[2]?.trim() || '';
                const initialsMatch = details.match(/([A-Z,]+)$/);
                const status = initialsMatch ? details.replace(initialsMatch[0], '').trim() : details;
                const initials = initialsMatch ? initialsMatch[1].split(',').filter(Boolean) : [];
                report.bathroomEvents.push({ time, type: 'diaper', status, initials });
            }
            // Add logic for potty if needed: /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*potty\s*-\s*(.*)/i
        });
    } else {
         logger.debug("Bathroom section not found.");
    }

    // --- Activities ---
    const activitiesHeading = contentArea.find('*:contains("ACTIVITIES")').first();
    if (activitiesHeading.length) {
        let current = activitiesHeading.next();
        while (current.length > 0 && !current.is(':contains("SNAPSHOTS")')) { // Stop at Snapshots
            const txt = current.text().trim();
            // Filter out common non-activity lines if necessary
            if (txt && !txt.toUpperCase().startsWith('WEEKLY THEME:') && !txt.toUpperCase().startsWith('GOALS:')) {
                // Remove trailing goals if present
                const goalsIndex = txt.toUpperCase().indexOf(' - GOALS:');
                const description = goalsIndex !== -1 ? txt.substring(0, goalsIndex).trim() : txt;
                if (description) { // Ensure description is not empty after trimming
                    report.activities.push({ description });
                }
            }
            current = current.next();
        }
    } else {
         logger.debug("Activities section not found.");
    }

    // --- Photos (Snapshots) ---
    const photosHeading = contentArea.find('*:contains("SNAPSHOTS")').first();
    if (photosHeading.length) {
        // Find images that are direct siblings or nested within sibling containers
        photosHeading.nextUntil(sectionHeadingsSelector).each((i, container) => {
            $(container).find('img').each((j, el) => {
                const src = $(el).attr('src');
                if (src && !report.photos.some(p => p.src === src)) {
                    // Try to get description from alt text or nearby text node/element
                    const altText = $(el).attr('alt')?.trim();
                    const nextText = $(el).parent().next().text().trim() || $(el).closest('td, div, p').next().text().trim();
                    const description = altText || nextText || '';
                    report.photos.push({ src, description });
                }
            });
        });
         // Also check images directly following the heading (less common structure)
         photosHeading.nextAll('img').each((i, el) => {
             const src = $(el).attr('src');
             if (src && !report.photos.some(p => p.src === src)) {
                 const altText = $(el).attr('alt')?.trim();
                 const nextText = $(el).next().text().trim();
                 const description = altText || nextText || '';
                 report.photos.push({ src, description });
             }
         });
    } else {
         logger.debug("Snapshots section not found.");
    }

    // logger.debug({ parsedReport: report }, "Finished parsing report data"); // Log detailed parsed data only in debug
    return report;
}


/**
 * Converts a time string (e.g., "10:01 AM", "2:23 PM", "14:30") to "HH:MM:SS" format.
 * Handles potential AM/PM and missing seconds.
 * @param timeStr The time string to format.
 * @returns The formatted time string "HH:MM:SS" or null if parsing fails.
 */
export function formatTime(timeStr: string | undefined | null): string | null {
    if (!timeStr) return null;

    // Normalize potential variations (e.g., missing space before AM/PM)
    const normalizedTime = timeStr.replace(/([ap])m$/i, ' $1M').trim();

    // Attempt to parse using common formats
    const date = new Date(`1970-01-01 ${normalizedTime}`);

    if (isNaN(date.getTime())) {
        logger.warn(`Could not parse time string: ${timeStr}`);
        return null; // Return null if parsing failed
    }

    // Format to HH:MM:SS using UTC methods to avoid timezone issues
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
