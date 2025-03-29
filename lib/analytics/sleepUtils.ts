import { Database } from '@/lib/supabase/types'; // Assuming Supabase types are defined here

// Define a type for the raw nap data structure from Supabase
type RawNapData = {
    duration_text: string | null;
};

// Define a type for the raw report data structure from Supabase
type RawReportData = {
    date: string; // Expecting 'YYYY-MM-DD' format
    naps: RawNapData[] | RawNapData | null; // Can be array, single object, or null
};

// Define the structure for the final chart data point
export type SleepChartDataPoint = {
    date: string;
    totalMinutes: number;
};

/**
 * Parses a duration string (e.g., "1 hr 41 mins") into total minutes.
 * @param {string | null} durationText - The duration string to parse.
 * @returns {number} The total duration in minutes. Returns 0 if input is null or invalid.
 */
export function parseDurationToMinutes(durationText: string | null): number {
    if (!durationText) return 0;
    let totalMinutes = 0;
    const hourMatch = durationText.match(/(\d+)\s*hr/);
    const minMatch = durationText.match(/(\d+)\s*min/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
    return totalMinutes;
}

/**
 * Aggregates sleep data from daily reports into total minutes per day.
 * @param {RawReportData[]} reportData - Array of daily report data containing naps.
 * @returns {SleepChartDataPoint[]} An array of objects formatted for charting.
 */
export function aggregateSleepData(reportData: RawReportData[]): SleepChartDataPoint[] {
    const aggregatedData: { [date: string]: number } = {};

    reportData.forEach(report => {
        const dateStr = report.date; // Already in YYYY-MM-DD format
        if (!aggregatedData[dateStr]) {
            aggregatedData[dateStr] = 0;
        }

        // Handle cases where naps might be null, a single object, or an array
        let naps: RawNapData[] = [];
        if (Array.isArray(report.naps)) {
            naps = report.naps;
        } else if (report.naps) {
            naps = [report.naps];
        }

        naps.forEach((nap) => {
            aggregatedData[dateStr] += parseDurationToMinutes(nap.duration_text);
        });
    });

    // Format for recharts (e.g., [{ date: 'YYYY-MM-DD', totalMinutes: 120 }, ...])
    const chartData = Object.entries(aggregatedData).map(([date, totalMinutes]) => ({
        date,
        totalMinutes,
    }));

    return chartData;
}
