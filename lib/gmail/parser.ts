import * as cheerio from 'cheerio';
import { gmail_v1 } from 'googleapis';
import pino from 'pino';
import globalLogger from '@/lib/logger';

// --- Types ---
export type ReportParser = (
    htmlContent: string,
    logger: pino.Logger
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
    type: string;
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
    messageId?: string;
    childName: string;
    reportDate: string;
    teacherNotes: string;
    naps: ParsedNap[];
    meals: ParsedMeal[];
    bathroomEvents: ParsedBathroomEvent[];
    activities: ParsedActivity[];
    photos: ParsedPhoto[];
}

// --- Helper Functions ---
export function base64UrlDecode(input: string): string {
    try {
        let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
            if (pad === 1) throw new Error('Invalid base64url string length.');
            base64 += new Array(5 - pad).join('=');
        }
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error: any) {
        globalLogger.error({ err: error, inputLength: input?.length }, "Failed to decode base64url string");
        throw new Error(`Failed to decode base64url: ${error.message}`);
    }
}

export function findHtmlPart(parts: gmail_v1.Schema$MessagePart[] | undefined): gmail_v1.Schema$MessagePart | null {
    if (!parts) return null;
    for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) return part;
        const nestedPart = findHtmlPart(part.parts);
        if (nestedPart) return nestedPart;
    }
    return null;
}

// Updated getTextUntil to be more robust, potentially accepting a more specific stop condition
// For now, its internal logic remains similar but its usage context in parsers will be more specific.
function getTextUntil(startElement: cheerio.Cheerio, stopSelector: string, $: cheerio.Root): string[] {
    const texts: string[] = [];
    const commonStopHeadings = ["NAPS", "MEALS", "BATHROOM", "ACTIVITIES", "SNAPSHOTS", "TODAY'S TEACHER NOTES", "PARENT NOTES"];
    const combinedStopSelector = `${stopSelector}, ${commonStopHeadings.map(h => `*:contains("${h}")`).join(', ')}`;

    startElement.nextAll().each((index: number, element: cheerio.Element) => {
        const currentElement = $(element);
        if (currentElement.is(combinedStopSelector)) return false;
        const text = currentElement.text().trim();
        if (text) texts.push(text);
    });
    return texts;
}

// --- Parsers ---

export const parseTadpolesReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    logger.info("parseTadpolesReport: Starting parsing.");
    const $ = cheerio.load(htmlContent);
    const report: ParsedReport = {
        childName: '', reportDate: '', teacherNotes: '',
        naps: [], meals: [], bathroomEvents: [], activities: [], photos: [],
    };

    const contentArea = $('body'); // Keep it broad for now, specific Tadpoles structure varies

    // --- Child Name and Report Date ---
    // Try to find a table cell that contains "DAILY REPORT -" and also the child's name in a strong tag.
    // This is an assumption based on common Tadpoles layouts.
    let reportHeaderCell = $('td').filter((i, el) => {
        const text = $(el).text();
        return text.includes("DAILY REPORT -") && $(el).find('strong').length > 0;
    }).first();

    if (reportHeaderCell.length) {
        const childNameStrong = reportHeaderCell.find('strong').first();
        report.childName = childNameStrong.text().trim();
        
        const headerText = reportHeaderCell.text();
        const dateMatch = headerText.match(/DAILY REPORT - (.*)/i);
        report.reportDate = dateMatch ? dateMatch[1].trim() : '';
    } else {
        // Fallback to previous logic if the above more specific selector fails
        const reportHeaderFallback = contentArea.find('*:contains("DAILY REPORT")').filter((i, el) => {
            return $(el).text().toUpperCase().includes('DAILY REPORT -');
        }).first();
        if (reportHeaderFallback.length) {
            const headerText = reportHeaderFallback.text();
            const dateMatch = headerText.match(/DAILY REPORT - (.*)/i);
            report.reportDate = dateMatch ? dateMatch[1].trim() : '';
            let nameElement = reportHeaderFallback.prev();
            if (!nameElement.length || nameElement.text().trim() === '') nameElement = reportHeaderFallback.parent().prev();
            report.childName = nameElement.text().trim();
             logger.warn("parseTadpolesReport: Used fallback for Child Name/Report Date extraction.");
        }
    }
    
    if (!report.childName || !report.reportDate) {
        logger.error("parseTadpolesReport: Critical information (childName or reportDate) could not be parsed. Aborting.");
        return null;
    }
    logger.info({ childName: report.childName, reportDate: report.reportDate }, "parseTadpolesReport: Child Name and Report Date extracted.");

    // --- Generic Section Parsing ---
    // Define section details: { titleInHtml: keyInReportObject, itemParser?: (itemText, logger) => object | null }
    const sections = [
        { title: "TODAY'S TEACHER NOTES", key: 'teacherNotes', isList: false },
        { title: "NAPS", key: 'naps', isList: true, itemParseFn: (text: string) => {
            const m = text.match(/slept for (.*?) from (\d{1,2}:\d{2}\s*(?:AM|PM)?) to (\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            return m ? { durationText: m[1]?.trim() || null, startTime: m[2]?.trim() || null, endTime: m[3]?.trim() || null } : null;
        }},
        { title: "MEALS", key: 'meals', isList: true, itemParseFn: (text: string) => {
            const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(.*)/);
            if (!m) return null;
            const details = m[2]?.trim() || '';
            const initialsMatch = details.match(/([A-Z,]+)$/);
            const food = initialsMatch ? details.replace(initialsMatch[0], '').trim() : details;
            const initials = initialsMatch ? initialsMatch[1].split(',').filter(Boolean) : [];
            return { time: m[1]?.trim() || null, food, details, initials };
        }},
        { title: "BATHROOM", key: 'bathroomEvents', isList: true, itemParseFn: (text: string) => {
            const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*diaper\s*-\s*(.*)/i);
            if(!m) return null;
            const details = m[2]?.trim() || '';
            const initialsMatch = details.match(/([A-Z,]+)$/);
            const status = initialsMatch ? details.replace(initialsMatch[0], '').trim() : details;
            const initials = initialsMatch ? initialsMatch[1].split(',').filter(Boolean) : [];
            return { time: m[1]?.trim() || null, type: 'diaper', status, initials };
        }},
        { title: "ACTIVITIES", key: 'activities', isList: true, itemParseFn: (text: string) => {
             if (text.toUpperCase().startsWith('WEEKLY THEME:') || text.toUpperCase().startsWith('GOALS:')) return null;
             const goalsIndex = text.toUpperCase().indexOf(' - GOALS:');
             const description = goalsIndex !== -1 ? text.substring(0, goalsIndex).trim() : text;
             return description ? { description } : null;
        }}
    ];

    // A more specific selector for section headings if they are consistently, e.g., bolded text in a td
    const sectionHeadingBaseSelector = 'td > strong, td > b, td > font[size="+1"]'; 
    // Fallback general selector if specific structure is not found
    const generalSectionHeadingSelector = 'h1, h2, h3, h4, h5, h6, strong, b, p > font[size="+1"], div[style*="font-weight: bold"]';


    sections.forEach(section => {
        let sectionHeading = contentArea.find(`${sectionHeadingBaseSelector}:contains("${section.title}")`).first();
        if (!sectionHeading.length) {
             sectionHeading = contentArea.find(`*:contains("${section.title}")`).first(); // Broader fallback
             if(sectionHeading.length) logger.warn(`parseTadpolesReport: Used fallback selector for ${section.title} heading.`);
        }

        if (sectionHeading.length) {
            // Attempt to find a common parent (e.g., a <tr> or a <div>) that contains both the heading and its content.
            // This helps to scope the search for content and the next heading.
            const sectionParent = sectionHeading.closest('tr, div.sectionContainer'); // Example: adjust 'div.sectionContainer'
            const contentSource = sectionParent.length ? sectionParent : contentArea;
            
            // Determine a reliable stop selector for getTextUntil. This might be the next section's specific heading.
            // For simplicity, using generalSectionHeadingSelector for now.
            const itemsText = getTextUntil(sectionHeading, generalSectionHeadingSelector, $);

            if (section.isList && section.itemParseFn) {
                itemsText.forEach(itemStr => {
                    try {
                        const parsedItem = section.itemParseFn(itemStr);
                        if (parsedItem) {
                            (report[section.key as keyof ParsedReport] as any[]).push(parsedItem);
                        } else {
                            logger.warn({itemStr, section: section.title}, `parseTadpolesReport: Skipped malformed item in ${section.title}.`);
                        }
                    } catch (e: any) {
                        logger.error({error: e.message, itemStr, section: section.title}, `parseTadpolesReport: Error parsing item in ${section.title}.`);
                    }
                });
            } else if (!section.isList) {
                (report[section.key as keyof ParsedReport] as string) = itemsText.join('\n');
            }
        } else {
            logger.warn(`parseTadpolesReport: Section heading for "${section.title}" not found. Skipping section.`);
        }
    });
    
    // --- Photos (Snapshots) ---
    // This often has a less structured text-based content compared to items above.
    let photosHeading = contentArea.find(`${sectionHeadingBaseSelector}:contains("SNAPSHOTS")`).first();
    if (!photosHeading.length) {
        photosHeading = contentArea.find(`*:contains("SNAPSHOTS")`).first();
        if(photosHeading.length) logger.warn(`parseTadpolesReport: Used fallback selector for SNAPSHOTS heading.`);
    }

    if (photosHeading.length) {
        const photoContainer = photosHeading.closest('tr, div.sectionContainer').length ? photosHeading.closest('tr, div.sectionContainer') : contentArea;
        photoContainer.find('img').each((j, el) => {
            try {
                const src = $(el).attr('src');
                if (src && !src.startsWith('data:image/')) { // Avoid inline data URIs if they are not actual photos
                    let description = $(el).attr('alt')?.trim() || '';
                    // Try to get description from a nearby sibling or parent's text if alt is empty
                    if (!description) {
                         const parentTd = $(el).closest('td');
                         description = parentTd.next('td').text().trim(); // If image is in one cell, desc in next
                         if(!description) description = parentTd.find('div, span').last().text().trim(); // Text within same cell
                    }
                    report.photos.push({ src, description: description || "Snapshot" });
                }
            } catch(e:any) {
                logger.error({error: e.message, src: $(el).attr('src')}, `parseTadpolesReport: Error parsing photo element.`);
            }
        });
    } else {
        logger.warn("parseTadpolesReport: Section heading for 'SNAPSHOTS' not found. Skipping photo parsing.");
    }

    logger.info("parseTadpolesReport: Finished parsing.");
    return report;
};


export const parseGoddardViaTadpolesReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    logger.info("parseGoddardViaTadpolesReport: Starting parsing.");
    const $ = cheerio.load(htmlContent);
    const report: ParsedReport = {
        childName: '', reportDate: '', teacherNotes: '',
        naps: [], meals: [], bathroomEvents: [], activities: [], photos: [],
    };

    let contentArea = $('body table[width="320"][bgcolor="#004c77"] table[width="310"][bgcolor="#FFF"]').first();
    if (!contentArea.length) {
        logger.warn("parseGoddardViaTadpolesReport: Could not find specific main content area table. Using body as fallback.");
        contentArea = $('body'); // Fallback to body
    }

    const nameElement = contentArea.find('h1[style*="font-size:50px"]');
    if (nameElement.length) {
        report.childName = nameElement.text().replace(/&nbsp;/g, '').trim();
    } else {
        logger.warn("parseGoddardViaTadpolesReport: Child name <h1> not found.");
    }
    
    const dateHeaderElement = contentArea.find('h3:contains("DAILY REPORT -")');
    if (dateHeaderElement.length) {
        const headerText = dateHeaderElement.text();
        const dateMatch = headerText.match(/DAILY REPORT - (.*)/i);
        report.reportDate = dateMatch ? dateMatch[1].trim() : '';
    } else {
        logger.warn("parseGoddardViaTadpolesReport: 'DAILY REPORT - <Date>' header <h3> not found.");
    }

    if (!report.childName || !report.reportDate) {
        logger.error("parseGoddardViaTadpolesReport: Critical information (childName or reportDate) could not be parsed. Aborting.");
        return null;
    }
    logger.info({ childName: report.childName, reportDate: report.reportDate }, "parseGoddardViaTadpolesReport: Child Name and Report Date extracted.");

    const notesHeading = contentArea.find('h3:contains("TODAY\'S TEACHER NOTES")').first();
    if (notesHeading.length) {
        const notesContainer = notesHeading.closest('td');
        let notesTexts: string[] = [];
        notesContainer.find('div').first().find('span[style*="font-size: 13px"]').each((i, el) => { // More specific span selector
            const text = $(el).text().trim();
            if (text) notesTexts.push(text);
        });
        const itemsNeededHeader = notesContainer.find('span:contains("Please bring in the following items:")');
        if (itemsNeededHeader.length) {
            const items: string[] = [];
            itemsNeededHeader.closest('tr').nextAll('tr').find('table tr td:last-child span').each((j, span_el) => {
                 const itemText = $(span_el).text().trim();
                 if(itemText && itemText !== "•") items.push(itemText);
            });
            if (items.length > 0) notesTexts.push("Please bring in: " + items.join(', '));
        }
        report.teacherNotes = notesTexts.join('\n').replace(/\n\s*\n/g, '\n');
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Teacher Notes section not found.");
    }

    const sectionBaseSelector = 'h2[style*="font-size: 24px"]';

    // Naps
    const napsHeading = contentArea.find(`${sectionBaseSelector}:contains("NAPS")`).first();
    if (napsHeading.length) {
        const napsTable = napsHeading.next('table');
        if (napsTable.length) {
            napsTable.find('tr').each((i, tr_el) => {
                try {
                    const text = $(tr_el).find('span[style*="font-size:14px"]').first().text().trim();
                    if (!text) return;
                    const m = text.match(/slept for (.*?) from (\d{1,2}:\d{2}(?:\s*(?:AM|PM))?) to (\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i);
                    if (m) {
                        report.naps.push({ durationText: m[1]?.trim() || null, startTime: m[2]?.trim() || null, endTime: m[3]?.trim() || null });
                    } else {
                        logger.warn({text}, "parseGoddardViaTadpolesReport: Malformed nap entry skipped.");
                        report.naps.push({ durationText: text, startTime: null, endTime: null }); // Save raw text if pattern fails
                    }
                } catch (e:any) {
                     logger.error({error: e.message, text: $(tr_el).text()}, "parseGoddardViaTadpolesReport: Error parsing nap item.");
                }
            });
        } else {
            logger.warn("parseGoddardViaTadpolesReport: Naps table not found after heading.");
        }
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Naps section heading not found.");
    }

    // Meals
    const mealsHeading = contentArea.find(`${sectionBaseSelector}:contains("MEALS")`).first();
    if (mealsHeading.length) {
        const mealsTable = mealsHeading.next('table');
        if(mealsTable.length){
            mealsTable.find('tr').each((i, tr_el) => {
                try {
                    const mainTextEl = $(tr_el).find('span[style*="font-size:14px"]').first();
                    const mainText = mainTextEl.text().trim();
                    if (!mainText) return;
                    const initialsEl = $(tr_el).find('div[style*="margin-left:20px"] span');
                    const initialsText = initialsEl.text().trim();
                    const mealMatch = mainText.match(/(?:(.*)\s@\s)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(.*)/i);
                    if (mealMatch) {
                        const mealTypeOrTime = mealMatch[1]; 
                        const time = mealTypeOrTime && mealMatch[2] ? mealMatch[2].trim() : mealMatch[1].trim(); 
                        let foodDescription = mealTypeOrTime && mealMatch[2] ? mealMatch[3].trim() : mealMatch[2].trim();
                        const fullDetails = mealTypeOrTime ? `${mealTypeOrTime.trim()}: ${foodDescription}` : foodDescription;
                        report.meals.push({
                            time: time || null, food: foodDescription, details: fullDetails, 
                            initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : []
                        });
                    } else {
                        logger.warn({text: mainText}, "parseGoddardViaTadpolesReport: Malformed meal entry skipped.");
                        report.meals.push({ time: null, food: mainText, details: mainText, initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : [] });
                    }
                } catch (e:any) {
                     logger.error({error: e.message, text: $(tr_el).text()}, "parseGoddardViaTadpolesReport: Error parsing meal item.");
                }
            });
        }  else {
            logger.warn("parseGoddardViaTadpolesReport: Meals table not found after heading.");
        }
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Meals section heading not found.");
    }

    // Bathroom
    const bathroomHeading = contentArea.find(`${sectionBaseSelector}:contains("BATHROOM")`).first();
    if (bathroomHeading.length) {
        const bathroomTable = bathroomHeading.next('table');
        if (bathroomTable.length) {
            bathroomTable.find('tr').each((i, tr_el) => {
                try {
                    const mainTextEl = $(tr_el).find('span[style*="font-size:14px"]').first();
                    let mainText = mainTextEl.text().trim();
                    if(!mainText) return;
                    let initialsText = $(tr_el).find('div[style*="margin-left:20px"] span').text().trim();
                    if (!initialsText) {
                         const floatInitialEl = $(tr_el).find('span[style*="float:right"]');
                         if (floatInitialEl.length) {
                             initialsText = floatInitialEl.text().trim();
                             mainText = mainText.replace(initialsText, '').trim();
                         }
                    }
                    const m = mainText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*diaper\s*-\s*(.*)/i);
                    if (m) {
                        report.bathroomEvents.push({ time: m[1]?.trim() || null, type: 'diaper', status: m[2]?.trim() || '', initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : [] });
                    } else {
                        logger.warn({text: mainText}, "parseGoddardViaTadpolesReport: Malformed bathroom entry skipped.");
                        report.bathroomEvents.push({ time: null, type: 'unknown', status: mainText, initials: initialsText ? initialsText.split(/[,.\s]+/).filter(Boolean) : [] });
                    }
                } catch (e:any) {
                    logger.error({error: e.message, text: $(tr_el).text()}, "parseGoddardViaTadpolesReport: Error parsing bathroom item.");
                }
            });
        } else {
             logger.warn("parseGoddardViaTadpolesReport: Bathroom table not found after heading.");
        }
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Bathroom section heading not found.");
    }

    // Activities
    const activitiesHeading = contentArea.find(`${sectionBaseSelector}:contains("ACTIVITIES")`).first();
    if (activitiesHeading.length) {
        const activitiesTable = activitiesHeading.next('table');
        if (activitiesTable.length) {
            activitiesTable.find('tr').each((i, tr_el) => {
                try {
                    const activityTitleEl = $(tr_el).find('span[style*="font-weight:bold"]').first();
                    const activityTitle = activityTitleEl.text().trim();
                    if (!activityTitle) return; // Skip if no title

                    let description = "";
                    const descriptionContainer = activityTitleEl.parent().find('div[style*="margin-left:20px"]').first();
                    if (descriptionContainer.length) {
                         description = descriptionContainer.find('span[style*="font-size:13px"], div[style*="font-size:13px"]').first().text().trim();
                         if (!description && descriptionContainer.length) description = descriptionContainer.text().trim();
                    } else { 
                        description = activityTitleEl.parent().contents().filter(function() { return this.type === 'text'; }).text().trim();
                    }
                    
                    if (activityTitle.toLowerCase().includes("weekly theme:")) {
                        const themeDescription = activityTitle.replace(/Weekly Theme:\s*/i, '').trim() || description;
                        if (themeDescription && !report.teacherNotes?.includes(themeDescription)) {
                             report.teacherNotes = report.teacherNotes ? `${report.teacherNotes}\nWeekly Theme: ${themeDescription}` : `Weekly Theme: ${themeDescription}`;
                        }
                        return; 
                    }

                    let fullDescription = activityTitle;
                    if (description && description.toLowerCase() !== activityTitle.toLowerCase()) {
                        fullDescription += (fullDescription ? ": " : "") + description;
                    }
                    if (fullDescription) report.activities.push({ description: fullDescription });

                    const imgEl = $(tr_el).find('img[src*="tadpoles.com/m/p/"]');
                    if (imgEl.length) {
                        const imgSrc = imgEl.attr('src');
                        if (imgSrc && !report.photos.some(p => p.src === imgSrc)) {
                             report.photos.push({ src: imgSrc, description: activityTitle || "Activity photo" });
                        }
                    }
                } catch (e:any) {
                     logger.error({error: e.message, text: $(tr_el).text()}, "parseGoddardViaTadpolesReport: Error parsing activity item.");
                }
            });
        } else {
            logger.warn("parseGoddardViaTadpolesReport: Activities table not found after heading.");
        }
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Activities section heading not found.");
    }

    // Photos (Snapshots)
    const photosHeading = contentArea.find(`${sectionBaseSelector}:contains("SNAPSHOTS")`).first();
    if (photosHeading.length) {
        const photosTable = photosHeading.next('table');
        if (photosTable.length) {
            photosTable.find('tr').each((i, tr_el) => {
                try {
                    const imgEl = $(tr_el).find('img[src*="tadpoles.com/m/p/"]');
                    const imgSrc = imgEl.attr('src');
                    if (!imgSrc) return;

                    if (!report.photos.some(p => p.src === imgSrc)) { 
                        let description = "";
                        const descContainer = $(tr_el).find('td').last(); 
                        const titleSpan = descContainer.find('span[style*="font-weight:bold"]').first();
                        const detailEl = titleSpan.next('div').find('span[style*="font-size:13px"]').first();
                        
                        description = titleSpan.text().trim();
                        if (detailEl.length && detailEl.text().trim() && detailEl.text().trim() !== '&nbsp;') {
                            description += (description ? " - " : "") + detailEl.text().trim();
                        } else if (!detailEl.length && titleSpan.next('div').text().trim() && titleSpan.next('div').text().trim() !== '&nbsp;') {
                             description += (description ? " - " : "") + titleSpan.next('div').text().trim();
                        }
                        report.photos.push({ src: imgSrc, description: description || "Snapshot" });
                    }
                } catch (e:any) {
                     logger.error({error: e.message, text: $(tr_el).text()}, "parseGoddardViaTadpolesReport: Error parsing photo item.");
                }
            });
        } else {
            logger.warn("parseGoddardViaTadpolesReport: Snapshots table not found after heading.");
        }
    } else {
         logger.warn("parseGoddardViaTadpolesReport: Snapshots section heading not found.");
    }

    logger.info({ childName: report.childName, reportDate: report.reportDate }, "parseGoddardViaTadpolesReport: Finished parsing.");
    return report;
};

export const parseMontessoriReport: ReportParser = (htmlContent: string, logger: pino.Logger): ParsedReport | null => {
    logger.info("parseMontessoriReport: Montessori parser not yet implemented. Skipping.");
    return null;
};

export function formatTime(timeStr: string | undefined | null): string | null {
    if (!timeStr) return null;
    const normalizedTime = timeStr.replace(/([ap])m$/i, ' $1M').trim();
    const date = new Date(`1970-01-01 ${normalizedTime}`);
    if (isNaN(date.getTime())) {
        globalLogger.warn(`Could not parse time string: ${timeStr}`);
        return null;
    }
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}
