// Define a type for the raw meal data structure from Supabase
type RawMealData = {
    food_description: string | null;
};

// Define a type for the raw report data structure from Supabase
type RawReportData = {
    date: string; // Expecting 'YYYY-MM-DD' format
    meals: RawMealData[] | RawMealData | null; // Can be array, single object, or null
};

// Define the structure for the final chart data points
export type MealFrequencyDataPoint = {
    date: string;
    count: number; // Number of meals on that day
};

export type MealBreakdownDataPoint = {
    name: string; // Food type/name
    value: number; // Count of that food type
};

// Define the structure for the aggregated result
export type AggregatedMealData = {
    frequency: MealFrequencyDataPoint[];
    breakdown: MealBreakdownDataPoint[];
};

/**
 * Aggregates meal data from daily reports into daily frequency and food type counts.
 * @param {RawReportData[]} reportData - Array of daily report data containing meals.
 * @returns {AggregatedMealData} An object containing arrays for frequency and breakdown charts.
 */
export function aggregateMealData(reportData: RawReportData[]): AggregatedMealData {
    const dailyFrequency: { [date: string]: number } = {};
    const foodTypeCounts: { [food: string]: number } = {};

    reportData.forEach(report => {
        const dateStr = report.date;

        // Handle cases where meals might be null, a single object, or an array
        let meals: RawMealData[] = [];
        if (Array.isArray(report.meals)) {
            meals = report.meals;
        } else if (report.meals) {
            meals = [report.meals];
        }

        // Initialize frequency count for the day if not present
        if (!dailyFrequency[dateStr]) {
            dailyFrequency[dateStr] = 0;
        }
        // Increment count by the number of meals found for that day
        dailyFrequency[dateStr] += meals.length;

        // Process each meal for food type breakdown
        meals.forEach((meal) => {
            // Basic food type aggregation (can be refined)
            // Takes the first word, or 'Unknown' if description is null/empty
            const foodType = (meal.food_description?.trim() || 'Unknown').split(' ')[0];
            foodTypeCounts[foodType] = (foodTypeCounts[foodType] || 0) + 1;
        });
    });

    // Format for charts
    const frequencyChartData: MealFrequencyDataPoint[] = Object.entries(dailyFrequency).map(([date, count]) => ({
        date,
        count,
    }));

    const breakdownChartData: MealBreakdownDataPoint[] = Object.entries(foodTypeCounts).map(([name, value]) => ({
        name,
        value,
    }));

    return {
        frequency: frequencyChartData,
        breakdown: breakdownChartData,
    };
}
