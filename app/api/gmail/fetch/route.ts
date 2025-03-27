import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google, gmail_v1 } from 'googleapis';
import { type NextAuthOptions } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase/client'; // Import Supabase client
import { type Database } from '@/lib/supabase/types'; // Import generated types

// Helper function to decode base64url
function base64UrlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
    }
    input += new Array(5 - pad).join('=');
  }
  return Buffer.from(input, 'base64').toString('utf-8');
}

// Helper function to find the HTML body part
function findHtmlPart(parts: gmail_v1.Schema$MessagePart[] | undefined): gmail_v1.Schema$MessagePart | null {
  if (!parts) return null;
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return part;
    }
    const nestedPart = findHtmlPart(part.parts);
    if (nestedPart) return nestedPart;
  }
  return null;
}

// --- Parsing Functions ---
// TODO: Refine Cheerio types if possible
function getTextUntil(startElement: any, stopSelector: string, $: any): string[] {
  const texts: string[] = [];
  let currentElement = startElement.next();
  while (currentElement.length > 0 && !currentElement.is(stopSelector) && !currentElement.find(stopSelector).length) {
     const containsStopHeading = currentElement.find('*:contains("MEALS"), *:contains("BATHROOM"), *:contains("ACTIVITIES"), *:contains("SNAPSHOTS"), *:contains("TODAY\'S TEACHER NOTES")').length > 0;
     if (containsStopHeading) break;
    const text = currentElement.text().trim();
    if (text) texts.push(text);
    currentElement = currentElement.next();
  }
  return texts;
}

function parseReportData(htmlContent: string): any {
  const $ = cheerio.load(htmlContent);
  const report: any = {
    messageId: '', childName: '', reportDate: '', teacherNotes: '',
    naps: [], meals: [], bathroomEvents: [], activities: [], photos: [],
  };
  const contentArea = $('body');
  const reportHeader = contentArea.find('*:contains("DAILY REPORT")').first();
  if (reportHeader.length) {
    const headerText = reportHeader.text();
    const dateMatch = headerText.match(/DAILY REPORT - (.*)/);
    report.reportDate = dateMatch ? dateMatch[1].trim() : '';
    report.childName = reportHeader.prev().text().trim() || reportHeader.parent().prev().text().trim();
  }
  const sectionHeadingsSelector = 'h1, h2, h3, h4, h5, h6, strong, b, p > font[size="+1"]';
  const notesHeading = contentArea.find('*:contains("TODAY\'S TEACHER NOTES")').first();
  if (notesHeading.length) report.teacherNotes = getTextUntil(notesHeading, sectionHeadingsSelector, $).join('\n');
  const napsHeading = contentArea.find('*:contains("NAPS")').first();
  if (napsHeading.length) {
    getTextUntil(napsHeading, sectionHeadingsSelector, $).forEach(text => {
      const m = text.match(/slept for (.*?) from (\d{1,2}:\d{2}) to (\d{1,2}:\d{2})/);
      if (m) report.naps.push({ durationText: m[1], startTime: m[2], endTime: m[3] });
    });
  }
  const mealsHeading = contentArea.find('*:contains("MEALS")').first();
  if (mealsHeading.length) {
    getTextUntil(mealsHeading, sectionHeadingsSelector, $).forEach(text => {
      const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(.*)/);
      if (m) {
        const t = m[1].trim(); const d = m[2].trim();
        const iM = d.match(/([A-Z,]+)$/);
        const f = iM ? d.replace(iM[0], '').trim() : d;
        const i = iM ? iM[1].split(',').filter(Boolean) : [];
        report.meals.push({ time: t, food: f, details: d, initials: i });
      }
    });
  }
  const bathroomHeading = contentArea.find('*:contains("BATHROOM")').first();
  if (bathroomHeading.length) {
    getTextUntil(bathroomHeading, sectionHeadingsSelector, $).forEach(text => {
      const m = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*diaper\s*-\s*(.*)/);
      if (m) {
        const t = m[1].trim(); const d = m[2].trim();
        const iM = d.match(/([A-Z,]+)$/);
        const s = iM ? d.replace(iM[0], '').trim() : d;
        const i = iM ? iM[1].split(',').filter(Boolean) : [];
        report.bathroomEvents.push({ time: t, type: 'diaper', status: s, initials: i });
      }
    });
  }
  const activitiesHeading = contentArea.find('*:contains("ACTIVITIES")').first();
  if (activitiesHeading.length) {
    let current = activitiesHeading.next();
    while (current.length > 0 && !current.is(':contains("SNAPSHOTS")')) {
      const txt = current.text().trim();
      if (txt && !txt.startsWith('Weekly Theme:') && !txt.startsWith('Goals:')) {
        const gIdx = txt.indexOf(' - Goals:');
        const desc = gIdx !== -1 ? txt.substring(0, gIdx).trim() : txt;
        report.activities.push({ description: desc });
      }
      current = current.next();
    }
  }
  const photosHeading = contentArea.find('*:contains("SNAPSHOTS")').first();
  if (photosHeading.length) {
    photosHeading.nextAll('img').each((i: number, el: any) => {
      const src = $(el).attr('src');
      if (src) report.photos.push({ src, description: $(el).attr('alt') || $(el).next().text().trim() || '' });
    });
    photosHeading.nextUntil(sectionHeadingsSelector).find('img').each((i: number, el: any) => {
      const src = $(el).attr('src');
      if (src && !report.photos.some((p: { src: string }) => p.src === src)) {
        report.photos.push({ src, description: $(el).attr('alt') || $(el).closest('td, div, p').next().text().trim() || '' });
      }
    });
  }
  console.log("Parsed Report Data:", JSON.stringify(report, null, 2));
  return report;
}

// --- Helper to convert time string (e.g., "10:01 AM", "2:23") to "HH:MM:SS" format ---
function formatTime(timeStr: string | undefined): string | null {
    if (!timeStr) return null;
    // Try parsing with AM/PM first
    let date = new Date(`1970-01-01 ${timeStr}`);
    if (isNaN(date.getTime())) {
        // Try parsing without AM/PM (assuming 24-hour format or simple HH:MM)
        date = new Date(`1970-01-01 ${timeStr}:00`); // Add seconds for Date object
    }
    if (isNaN(date.getTime())) {
        console.warn(`Could not parse time string: ${timeStr}`);
        return null; // Could not parse
    }
    // Format to HH:MM:SS
    return date.toTimeString().split(' ')[0];
}


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken || !session.user?.id) { // Ensure user ID is available
    return NextResponse.json({ error: 'Not authenticated, access token, or user ID missing' }, { status: 401 });
  }
  const accessToken = session.accessToken;
  const userId = session.user.id; // Get user ID from session

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listResponse = await gmail.users.messages.list({
      userId: 'me', q: 'from:@tadpoles.com', maxResults: 5,
    });

    const messageItems = listResponse.data.messages || [];
    if (messageItems.length === 0) {
      return NextResponse.json({ message: 'No messages found from @tadpoles.com.' });
    }

    let reportsInsertedCount = 0;
    let reportsSkippedCount = 0;

    for (const messageItem of messageItems) {
      if (!messageItem.id) continue;
      try {
        // Check if message already processed
        const { data: existingReport, error: checkError } = await supabase
          .from('daily_reports')
          .select('id')
          .eq('gmail_message_id', messageItem.id)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingReport) {
          console.log(`Skipping already processed message ID: ${messageItem.id}`);
          reportsSkippedCount++;
          continue;
        }

        // Fetch full message
        const messageResponse = await gmail.users.messages.get({ userId: 'me', id: messageItem.id, format: 'full' });
        const messageData = messageResponse.data;
        const payload = messageData.payload;
        let htmlContent = '';
        if (payload?.mimeType === 'text/html' && payload.body?.data) {
          htmlContent = base64UrlDecode(payload.body.data);
        } else {
          const htmlPart = findHtmlPart(payload?.parts);
          if (htmlPart?.body?.data) htmlContent = base64UrlDecode(htmlPart.body.data);
        }

        if (htmlContent) {
          const reportData = parseReportData(htmlContent);

          // Find child_id based on parsed name and user_id
          const { data: childData, error: childError } = await supabase
            .from('children')
            .select('id')
            .eq('user_id', userId) // Match child to the logged-in user
            .ilike('name', `%${reportData.childName}%`) // Use ilike for case-insensitive partial match
            .maybeSingle();

          if (childError) throw childError;
          if (!childData) {
            console.warn(`Could not find child matching name "${reportData.childName}" for user ${userId}. Skipping report.`);
            continue; // Skip if child not found for this user
          }
          const childId = childData.id;

          // Convert report date string to 'YYYY-MM-DD'
          const reportDate = new Date(reportData.reportDate).toISOString().split('T')[0];
          if (!reportDate || reportDate === '1970-01-01') { // Basic check for invalid date
              console.warn(`Invalid report date parsed: ${reportData.reportDate}. Skipping report.`);
              continue;
          }


          // Upsert Daily Report (using gmail_message_id as conflict target)
          const { data: upsertedReport, error: reportError } = await supabase
            .from('daily_reports')
            .upsert({
              child_id: childId,
              date: reportDate, // Use formatted date
              teacher_notes: reportData.teacherNotes,
              gmail_message_id: messageItem.id,
              child_name_from_report: reportData.childName,
              report_date_from_report: reportData.reportDate,
            }, { onConflict: 'gmail_message_id', ignoreDuplicates: false }) // Ensure it returns the row
            .select('id')
            .single(); // Expect exactly one row

          if (reportError) throw reportError;
          if (!upsertedReport) throw new Error('Failed to upsert daily report or retrieve ID.');

          const reportId = upsertedReport.id;
          reportsInsertedCount++;

          // Insert related data
          if (reportData.naps.length > 0) {
            const napInserts = reportData.naps.map((nap: any) => ({
              report_id: reportId,
              start_time: formatTime(nap.startTime),
              end_time: formatTime(nap.endTime),
              duration_text: nap.durationText,
            }));
            const { error: napError } = await supabase.from('naps').insert(napInserts);
            if (napError) console.error('Error inserting naps:', napError.message);
          }

          if (reportData.meals.length > 0) {
            const mealInserts = reportData.meals.map((meal: any) => ({
              report_id: reportId,
              meal_time: formatTime(meal.time),
              food_description: meal.food,
              details: meal.details,
              initials: meal.initials,
            }));
            const { error: mealError } = await supabase.from('meals').insert(mealInserts);
            if (mealError) console.error('Error inserting meals:', mealError.message);
          }

          if (reportData.bathroomEvents.length > 0) {
            const bathroomInserts = reportData.bathroomEvents.map((event: any) => ({
              report_id: reportId,
              event_time: formatTime(event.time),
              event_type: event.type,
              status: event.status,
              initials: event.initials,
            }));
            const { error: bathroomError } = await supabase.from('bathroom_events').insert(bathroomInserts);
            if (bathroomError) console.error('Error inserting bathroom events:', bathroomError.message);
          }

          if (reportData.activities.length > 0) {
            const activityInserts = reportData.activities.map((activity: any) => ({
              report_id: reportId,
              description: activity.description,
            }));
            const { error: activityError } = await supabase.from('activities').insert(activityInserts);
            if (activityError) console.error('Error inserting activities:', activityError.message);
          }

          if (reportData.photos.length > 0) {
            const photoInserts = reportData.photos.map((photo: any) => ({
              report_id: reportId,
              image_url: photo.src,
              description: photo.description,
            }));
            const { error: photoError } = await supabase.from('photos').insert(photoInserts);
            if (photoError) console.error('Error inserting photos:', photoError.message);
          }

        } else {
          console.warn(`Could not find HTML body for message ID ${messageItem.id}`);
        }
      } catch (msgError: any) {
        console.error(`Error processing message ID ${messageItem.id}:`, msgError.message);
      }
    }

    return NextResponse.json({
      message: `Processed ${messageItems.length} message(s). Inserted: ${reportsInsertedCount}, Skipped (already processed): ${reportsSkippedCount}.`,
    });

  } catch (error: any) {
    console.error('Error fetching/processing Gmail messages:', error);
    if (error.code === 401) {
       return NextResponse.json({ error: 'Authentication error. Please sign in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch or process emails', details: error.message }, { status: 500 });
  }
}
