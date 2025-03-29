// Define a type for the raw activity data structure from Supabase
type RawActivityData = {
    description: string | null;
};

// Define a type for the raw report data structure from Supabase
type RawReportData = {
    date: string; // Expecting 'YYYY-MM-DD' format
    activities: RawActivityData[] | RawActivityData | null; // Can be array, single object, or null
};

// Define the structure for the final chart data points
export type ActivityFrequencyDataPoint = {
    date: string;
    count: number; // Number of activities on that day
};

export type ActivityBreakdownDataPoint = {
    name: string; // Activity type/name
    value: number; // Count of that activity type
};

// Define structure for heatmap data (day vs activity count)
export type ActivityHeatmapDataPoint = {
    day: string; // Day of the week (e.g., "Monday")
    [activityType: string]: number | string; // Activity counts, keyed by activity type name
};

// Define the structure for the aggregated result
export type AggregatedActivityData = {
    frequency: ActivityFrequencyDataPoint[];
    breakdown: ActivityBreakdownDataPoint[];
    heatmap: ActivityHeatmapDataPoint[];
    activityTypes: string[]; // List of top activity types used in heatmap/breakdown
};

// Helper to get a simplified activity type (e.g., first few words)
function getActivityType(description: string | null): string {
    if (!description) return 'Unknown';
    // Simple approach: take first 3 words, can be refined
    return description.trim().split(' ').slice(0, 3).join(' ');
}

/**
 * Aggregates activity data from daily reports into daily frequency, type breakdown, and heatmap data.
 * @param {RawReportData[]} reportData - Array of daily report data containing activities.
 * @returns {AggregatedActivityData} An object containing arrays/objects for different chart types.
 */
export function aggregateActivityData(reportData: RawReportData[]): AggregatedActivityData {
    const dailyActivityCount: { [date: string]: number } = {};
    const activityTypeCounts: { [activity: string]: number } = {};
    const activityByDayOfWeek: { [day: string]: { [activity: string]: number } } = {};

    reportData.forEach(report => {
        const dateStr = report.date;
        // Ensure correct date parsing for day of week calculation
        const date = new Date(dateStr + 'T00:00:00Z'); // Assume UTC or specify timezone if needed
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }); // Use UTC for consistency

        // Handle cases where activities might be null, a single object, or an array
        let activities: RawActivityData[] = [];
        if (Array.isArray(report.activities)) {
            activities = report.activities;
        } else if (report.activities) {
            activities = [report.activities];
        }

        // Count total activities per day
        dailyActivityCount[dateStr] = (dailyActivityCount[dateStr] || 0) + activities.length;

        // Process each activity for type breakdown and day of week counts
        activities.forEach((activity) => {
            const activityType = getActivityType(activity.description);

            // Count by activity type
            activityTypeCounts[activityType] = (activityTypeCounts[activityType] || 0) + 1;

            // Count by day of week
            if (!activityByDayOfWeek[dayOfWeek]) {
                activityByDayOfWeek[dayOfWeek] = {};
            }
            activityByDayOfWeek[dayOfWeek][activityType] =
                (activityByDayOfWeek[dayOfWeek][activityType] || 0) + 1;
        });
    });

    // Format frequency data
    const frequencyChartData: ActivityFrequencyDataPoint[] = Object.entries(dailyActivityCount).map(([date, count]) => ({
        date,
        count,
    }));

    // Get top 10 activity types for breakdown and heatmap consistency
    const topActivityTypes = Object.entries(activityTypeCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10)
        .map(([name]) => name);

    // Format breakdown data for top types
    const breakdownChartData: ActivityBreakdownDataPoint[] = topActivityTypes.map(name => ({
        name,
        value: activityTypeCounts[name],
    }));

    // Format heatmap data using only top types
    const heatmapData: ActivityHeatmapDataPoint[] = Object.entries(activityByDayOfWeek).map(([day, activities]) => {
        const dayData: ActivityHeatmapDataPoint = { day };
        topActivityTypes.forEach(type => {
            dayData[type] = activities[type] || 0; // Ensure all top types are present for the day, default to 0
        });
        return dayData;
    });

    return {
        frequency: frequencyChartData,
        breakdown: breakdownChartData,
        heatmap: heatmapData,
        activityTypes: topActivityTypes, // Return the list of types used
    };
}
