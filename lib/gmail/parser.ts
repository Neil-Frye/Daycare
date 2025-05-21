import * as cheerio from 'cheerio'; // Revert to namespace import
import { gmail_v1 } from 'googleapis';
import pino from 'pino'; // Import pino for the logger type
import globalLogger from '@/lib/logger'; // Import global logger for use in functions not part of a strategy or as a fallback

// --- Types --- (Define interfaces for better type safety)

// ReportParser function type
export type ReportParser = (
    htmlContent: string,
    logger: pino.Logger // Use pino.Logger as the type for the passed logger
) => ParsedReport | null;

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
        // Use globalLogger here as this function is generic and not part of a specific parsing strategy
        globalLogger.error({ err: error, inputLength: input?.length }, "Failed to decode base64url string");
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
// Use cheerio.Cheerio for the element collection and cheerio.Root for the loaded document ($)
function getTextUntil(startElement: cheerio.Cheerio, stopSelector: string, $: cheerio.Root): string[] {
    const texts: string[] = [];
    // Define common section headings that act as implicit stops
    const stopHeadings = [
        "NAPS", "MEALS", "BATHROOM", "ACTIVITIES", "SNAPSHOTS", "TODAY'S TEACHER NOTES", "PARENT NOTES"
        // Add any other known section titles here
    ];
    // Create a combined selector for explicit stops and heading stops
    const combinedStopSelector = `${stopSelector}, ${stopHeadings.map(h => `*:contains("${h}")`).join(', ')}`;

    // Iterate over all subsequent siblings, explicitly typing the callback parameters
    startElement.nextAll().each((index: number, element: cheerio.Element) => {
        const currentElement = $(element);

        // Check if the current element matches the combined stop selector
        if (currentElement.is(combinedStopSelector)) {
            // Check if the startElement itself contains a stop heading text (edge case)
            // We only stop if the *current* element is a stop, regardless of the start element.
            return false; // Stop .each() iteration
        }

        const text = currentElement.text().trim();
        if (text) {
            texts.push(text);
        }
    });

    return texts;
}


/**
 * Parses the HTML content of a Tadpoles daily report email.
 * @param htmlContent The HTML string.
 * @param logger The logger instance to use for logging within the parser.
 * @returns A ParsedReport object containing the extracted data, or null if critical parsing fails.
 */
export const parseTadpolesReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    // Let TypeScript infer the type of $ from cheerio.load(), which is cheerio.Root
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
        logger.warn("parseTadpolesReport: Could not find 'DAILY REPORT - <Date>' header.");
        // Fallback logic for date/name if needed
        // Depending on strictness, you might return null here if date/name are critical
    }

    // Define a more robust selector for section headings
    const sectionHeadingsSelector = 'h1, h2, h3, h4, h5, h6, strong, b, p > font[size="+1"], div[style*="font-weight: bold"]'; // Add common bold styles

    // --- Teacher Notes ---
    const notesHeading = contentArea.find('*:contains("TODAY\'S TEACHER NOTES")').first();
    if (notesHeading.length) {
        report.teacherNotes = getTextUntil(notesHeading, sectionHeadingsSelector, $).join('\n');
    } else {
         logger.debug("parseTadpolesReport: Teacher Notes section not found.");
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
         logger.debug("parseTadpolesReport: Naps section not found.");
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
         logger.debug("parseTadpolesReport: Meals section not found.");
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
         logger.debug("parseTadpolesReport: Bathroom section not found.");
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
         logger.debug("parseTadpolesReport: Activities section not found.");
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
         logger.debug("parseTadpolesReport: Snapshots section not found.");
    }

    // Ensure critical fields are present, otherwise return null
    if (!report.childName || !report.reportDate) {
        logger.warn("parseTadpolesReport: Missing critical information (childName or reportDate), returning null.");
        return null;
    }

    logger.debug({ parsedReport: report }, "parseTadpolesReport: Finished parsing report data");
    return report;
};

/**
 * Parses the HTML content of a Goddard school daily report (delivered via Tadpoles).
 * @param htmlContent The HTML string.
 * @param logger The logger instance to use for logging within the parser.
 * @returns A ParsedReport object containing the extracted data, or null if critical parsing fails.
 */
export const parseGoddardViaTadpolesReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    const $ = cheerio.load(htmlContent);
    const report: ParsedReport = {
        childName: '', reportDate: '', teacherNotes: '',
        naps: [], meals: [], bathroomEvents: [], activities: [], photos: [],
    };

    logger.info("parseGoddardViaTadpolesReport: Starting Goddard report parsing.");
    // More specific content area for Goddard, typically the table with width="310" inside the main colored table
    const contentArea = $('body table[width="320"][bgcolor="#004c77"] table[width="310"][bgcolor="#FFF"]').first();
    if (!contentArea.length) {
        logger.warn("parseGoddardViaTadpolesReport: Could not find main content area table. Using body as fallback.");
        // Fallback to body if the specific table isn't found, though this is less reliable
        // const contentArea = $('body'); // This was the original fallback, might be too broad
    }


    // --- Child Name and Report Date ---
    // Goddard: <h1 style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:50px;line-height:1;margin:0;color: #00457c;">OLIVER&nbsp;</h1>
    // Goddard: <h3 style="color: inherit;font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:18px;margin:0;">DAILY REPORT - May 20, 2025</h3>
    const nameElement = contentArea.find('h1[style*="font-size:50px"]');
    if (nameElement.length) {
        report.childName = nameElement.text().replace(/&nbsp;/g, '').trim();
    } else {
        logger.warn("parseGoddardViaTadpolesReport: Child name <h1> not found as expected.");
    }
    
    const dateHeaderElement = contentArea.find('h3:contains("DAILY REPORT -")');
    if (dateHeaderElement.length) {
        const headerText = dateHeaderElement.text();
        const dateMatch = headerText.match(/DAILY REPORT - (.*)/i);
        report.reportDate = dateMatch ? dateMatch[1].trim() : '';
    } else {
        logger.warn("parseGoddardViaTadpolesReport: 'DAILY REPORT - <Date>' header <h3> not found.");
    }

    if (!report.childName) logger.warn("parseGoddardViaTadpolesReport: Child name is missing after attempting extraction.");
    if (!report.reportDate) logger.warn("parseGoddardViaTadpolesReport: Report date is missing after attempting extraction.");


    // Define section selectors based on Goddard's h2 styling
    const sectionHeadingsBaseSelector = 'h2[style*="font-size: 24px"]';

    // --- Teacher Notes ---
    // Goddard: <h3 style="font-family:Trebuchet MS,Helvetica,Arial,sans-serif;font-size:18px;line-height:27px;margin:0;font-weight:bold;color:#00457c">TODAY&#39;S TEACHER NOTES</h3>
    const notesHeading = contentArea.find('h3:contains("TODAY\'S TEACHER NOTES")').first();
    if (notesHeading.length) {
        const notesContainer = notesHeading.next('div').find('table').first(); // The table right after the h3 div
        let notesTexts: string[] = [];
        
        // General notes: spans directly under the first td of the first tr
        notesContainer.find('tr > td > span[style*="font-size: 13px"]').each((i, el) => {
             const text = $(el).text().trim();
             if (text) notesTexts.push(text);
        });

        // "Please bring in the following items:"
        const itemsNeededHeader = notesContainer.find('span:contains("Please bring in the following items:")');
        if (itemsNeededHeader.length) {
            const items: string[] = [];
            // Items are in a nested table, usually after the "Please bring..." span's parent <tr>
            itemsNeededHeader.closest('tr').next('tr').find('table tr').each((i, tr_el) => {
                $(tr_el).find('td:last-child span').each((j, span_el) => { // Assuming item text is in the last td of each row
                     const itemText = $(span_el).text().trim();
                     if(itemText && itemText !== "•") items.push(itemText); // Filter out bullets
                });
            });
            if (items.length > 0) {
                 notesTexts.push("Please bring in: " + items.join(', '));
            }
        }
        report.teacherNotes = notesTexts.join('\n').replace(/\n\s*\n/g, '\n');
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Teacher Notes section not found.");
    }

    // --- Naps ---
    const napsHeading = contentArea.find(`${sectionHeadingsBaseSelector}:contains("NAPS")`).first();
    if (napsHeading.length) {
        napsHeading.next('table').find('span[style*="font-size:14px"]').each((i, el) => {
            const text = $(el).text().trim();
            const m = text.match(/slept for (.*?) from (\d{1,2}:\d{2}(?:\s*(?:AM|PM))?) to (\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i);
            if (m) {
                report.naps.push({
                    durationText: m[1]?.trim() || null,
                    startTime: m[2]?.trim() || null,
                    endTime: m[3]?.trim() || null
                });
            } else if (text) { // Capture any text even if it doesn't match the full pattern
                 report.naps.push({ durationText: text, startTime: null, endTime: null });
            }
        });
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Naps section not found.");
    }

    // --- Meals ---
    const mealsHeading = contentArea.find(`${sectionHeadingsBaseSelector}:contains("MEALS")`).first();
    if (mealsHeading.length) {
        mealsHeading.next('table').find('tr').each((i, tr_el) => {
            const mainTextEl = $(tr_el).find('span[style*="font-size:14px"]').first();
            const mainText = mainTextEl.text().trim();
            const initialsEl = $(tr_el).find('div[style*="margin-left:20px"] span');
            const initialsText = initialsEl.text().trim();

            const mealMatch = mainText.match(/(?:(.*)\s@\s)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(.*)/i);
            if (mealMatch) {
                const mealTypeOrTime = mealMatch[1]; 
                const time = mealTypeOrTime && mealMatch[2] ? mealMatch[2].trim() : mealMatch[1].trim(); 
                let foodDescription = mealTypeOrTime && mealMatch[2] ? mealMatch[3].trim() : mealMatch[2].trim();
                
                const fullDetails = mealTypeOrTime ? `${mealTypeOrTime.trim()}: ${foodDescription}` : foodDescription;

                report.meals.push({
                    time: time || null,
                    food: foodDescription, 
                    details: fullDetails, 
                    initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : []
                });
            } else if (mainText) {
                 report.meals.push({
                    time: null, food: mainText, details: mainText,
                    initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : []
                });
            }
        });
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Meals section not found.");
    }

    // --- Bathroom ---
    const bathroomHeading = contentArea.find(`${sectionHeadingsBaseSelector}:contains("BATHROOM")`).first();
    if (bathroomHeading.length) {
        bathroomHeading.next('table').find('tr').each((i, tr_el) => {
            const mainTextEl = $(tr_el).find('span[style*="font-size:14px"]').first();
            let mainText = mainTextEl.text().trim();
            
            let initialsText = $(tr_el).find('div[style*="margin-left:20px"] span').text().trim();
            if (!initialsText) { // Check for initials floated right
                 const floatInitialEl = $(tr_el).find('span[style*="float:right"]');
                 if (floatInitialEl.length) {
                     initialsText = floatInitialEl.text().trim();
                     mainText = mainText.replace(initialsText, '').trim(); // Remove from main text if picked up
                 }
            }

            const m = mainText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*diaper\s*-\s*(.*)/i);
            if (m) {
                report.bathroomEvents.push({
                    time: m[1]?.trim() || null, type: 'diaper', status: m[2]?.trim() || '',
                    initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : []
                });
            }  else if (mainText) { 
                 report.bathroomEvents.push({
                    time: null, type: 'unknown', status: mainText,
                    initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : []
                });
            }
        });
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Bathroom section not found.");
    }

    // --- Activities ---
    const activitiesHeading = contentArea.find(`${sectionHeadingsBaseSelector}:contains("ACTIVITIES")`).first();
    if (activitiesHeading.length) {
        activitiesHeading.next('table').find('tr').each((i, tr_el) => {
            const activityTitleEl = $(tr_el).find('span[style*="font-weight:bold"]').first();
            const activityTitle = activityTitleEl.text().trim();
            
            let description = "";
            const descriptionContainer = activityTitleEl.parent().find('div[style*="margin-left:20px"]').first();
            if (descriptionContainer.length) {
                 description = descriptionContainer.find('span[style*="font-size:13px"], div[style*="font-size:13px"]').first().text().trim();
                 if (!description && descriptionContainer.length) description = descriptionContainer.text().trim(); // Fallback if span isn't direct child
            } else { 
                description = activityTitleEl.parent().contents().filter(function() {
                    return this.type === 'text';
                }).text().trim();
            }
            
            if (activityTitle.toLowerCase().includes("weekly theme:")) {
                const themeDescription = activityTitle.replace(/Weekly Theme:\s*/i, '').trim();
                if (themeDescription && !report.teacherNotes?.includes(themeDescription)) {
                     report.teacherNotes = report.teacherNotes ? `${report.teacherNotes}\nWeekly Theme: ${themeDescription}` : `Weekly Theme: ${themeDescription}`;
                }
                return; 
            }

            let fullDescription = activityTitle;
            if (description && description.toLowerCase() !== activityTitle.toLowerCase()) {
                fullDescription += (fullDescription ? ": " : "") + description;
            }
            
            if (fullDescription) {
                 report.activities.push({ description: fullDescription });
            }

            const imgEl = $(tr_el).find('img[src*="tadpoles.com/m/p/"]');
            if (imgEl.length) {
                const imgSrc = imgEl.attr('src');
                if (imgSrc && !report.photos.some(p => p.src === imgSrc)) {
                     report.photos.push({
                        src: imgSrc,
                        description: activityTitle || "Activity photo" 
                    });
                }
            }
        });
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Activities section not found.");
    }


    // --- Photos (Snapshots) ---
    const photosHeading = contentArea.find(`${sectionHeadingsBaseSelector}:contains("SNAPSHOTS")`).first();
    if (photosHeading.length) {
        photosHeading.next('table').find('tr').each((i, tr_el) => {
            const imgEl = $(tr_el).find('img[src*="tadpoles.com/m/p/"]');
            const imgSrc = imgEl.attr('src');

            if (imgSrc && !report.photos.some(p => p.src === imgSrc)) { 
                let description = "";
                const descContainer = $(tr_el).find('td').last(); 
                const titleSpan = descContainer.find('span[style*="font-weight:bold"]').first();
                // The description detail is often in a div > span after the bold title span
                const detailEl = titleSpan.next('div').find('span[style*="font-size:13px"]').first();
                
                description = titleSpan.text().trim();
                if (detailEl.length && detailEl.text().trim() && detailEl.text().trim() !== '&nbsp;') {
                    description += (description ? " - " : "") + detailEl.text().trim();
                } else if (!detailEl.length && titleSpan.next('div').text().trim() && titleSpan.next('div').text().trim() !== '&nbsp;') {
                    // Fallback if structure is just title + div with text
                     description += (description ? " - " : "") + titleSpan.next('div').text().trim();
                }
                
                report.photos.push({
                    src: imgSrc,
                    description: description || "Snapshot"
                });
            }
        });
    } else {
         logger.debug("parseGoddardViaTadpolesReport: Snapshots section not found.");
    }


    // Ensure critical fields are present, otherwise return null
    if (!report.childName || !report.reportDate) {
        logger.warn("parseGoddardViaTadpolesReport: Missing critical information (childName or reportDate), returning null.");
        return null;
    }

    logger.info({ childName: report.childName, reportDate: report.reportDate, activitiesCount: report.activities.length, photoCount: report.photos.length }, "parseGoddardViaTadpolesReport: Finished parsing Goddard report data.");
    return report;
};

/**
 * Placeholder parser for Montessori school reports.
 * @param htmlContent The HTML string.
 * @param logger The logger instance to use for logging.
 * @returns Always returns null as it's not yet implemented.
 */
export const parseMontessoriReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    logger.info("parseMontessoriReport: Montessori parser not yet implemented. Skipping.");
    return null;
};


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
        // Use globalLogger here as this function is generic and not part of a specific parsing strategy
        globalLogger.warn(`Could not parse time string: ${timeStr}`);
        return null; // Return null if parsing failed
    }

    // Format to HH:MM:SS using UTC methods to avoid timezone issues
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
