'use client';

import { useState, useEffect, useMemo } from 'react'; // Add useMemo
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChildSelector } from '@/components/child-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'; // Import ChartLegend
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'; // Import PieChart components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { LabelList } from "recharts" // Import LabelList for Pie chart labels

// Data point interfaces
interface SleepDataPoint {
  date: string;
  totalMinutes: number;
}
interface MealFrequencyPoint {
    date: string;
    count: number;
}
interface MealBreakdownPoint {
    name: string;
    value: number;
}
interface MealAnalyticsData {
    frequency: MealFrequencyPoint[];
    breakdown: MealBreakdownPoint[];
}
interface ActivityAnalyticsData {
    frequency: MealFrequencyPoint[]; // Reuse same type
    breakdown: MealBreakdownPoint[]; // Reuse same type
    heatmap: any[]; // Array of { day: string, [activity: string]: number }
    activityTypes: string[]; // Top activity types
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  // Sleep State
  const [sleepData, setSleepData] = useState<SleepDataPoint[]>([]);
  const [isSleepLoading, setIsSleepLoading] = useState<boolean>(false);
  const [sleepError, setSleepError] = useState<string | null>(null);
  // Meal State
  const [mealData, setMealData] = useState<MealAnalyticsData | null>(null);
  const [isMealLoading, setIsMealLoading] = useState<boolean>(false);
  const [mealError, setMealError] = useState<string | null>(null);
  // Activity State
  const [activityData, setActivityData] = useState<ActivityAnalyticsData | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState<boolean>(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/'); // Redirect to home if not logged in
    }
  }, [status, router]);

  // Combined useEffect for fetching all analytics data
  useEffect(() => {
    if (!selectedChildId) {
      setSleepData([]);
      setMealData(null);
      // Reset other data states here...
      return;
    }

    // Fetch Sleep Data
    async function fetchSleepData() {
      setIsSleepLoading(true);
      setSleepError(null);
      try {
        const response = await fetch(`/api/analytics/sleep?childId=${selectedChildId}`);
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch sleep data');
        setSleepData(await response.json());
      } catch (err: any) {
        console.error("Sleep fetch error:", err);
        setSleepError(err.message); setSleepData([]);
      } finally {
        setIsSleepLoading(false);
      }
    }

    // Fetch Meal Data
    async function fetchMealData() {
        setIsMealLoading(true);
        setMealError(null);
        try {
          const response = await fetch(`/api/analytics/meals?childId=${selectedChildId}`);
          if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch meal data');
          setMealData(await response.json());
        } catch (err: any) {
          console.error("Meal fetch error:", err);
          setMealError(err.message); setMealData(null);
        } finally {
          setIsMealLoading(false);
        }
      }

    fetchSleepData();
    fetchMealData();
    fetchActivityData();
  }, [selectedChildId]);

  async function fetchActivityData() {
    setIsActivityLoading(true);
    setActivityError(null);
    try {
      const response = await fetch(`/api/analytics/activities?childId=${selectedChildId}`);
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch activity data');
      setActivityData(await response.json());
    } catch (err: any) {
      console.error("Activity fetch error:", err);
      setActivityError(err.message); setActivityData(null);
    } finally {
      setIsActivityLoading(false);
    }
  }


  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (status === 'unauthenticated') {
    return null; // Will be redirected by useEffect
  }

  // Chart configurations
  const sleepChartConfig = {
    totalMinutes: { label: "Total Nap Minutes", color: "hsl(var(--chart-1))" },
  };
  const mealFreqChartConfig = {
    count: { label: "Meals per Day", color: "hsl(var(--chart-2))" },
  };
   const mealBreakdownChartConfig = useMemo(() => {
    if (!mealData?.breakdown) return {};
    return mealData.breakdown.reduce((acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    }, {} as any);
  }, [mealData?.breakdown]);

  const activityBreakdownChartConfig = useMemo(() => {
    if (!activityData?.breakdown) return {};
    return activityData.breakdown.reduce((acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    }, {} as any);
  }, [activityData?.breakdown]);

  // Heatmap color scale function
  const getHeatmapColor = (value: number, max: number) => {
    const intensity = Math.min(1, value / max);
    const hue = 200 - (intensity * 120); // Blue to green gradient
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <ChildSelector onSelect={setSelectedChildId} />
      </header>

      {!selectedChildId && (
         <Alert>
           <AlertTitle>Select a Child</AlertTitle>
           <AlertDescription>
             Please select a child from the dropdown above to view their analytics.
           </AlertDescription>
         </Alert>
      )}

      {selectedChildId && (
        <div className="space-y-6">
          {/* Combined Error Display (Optional) */}
          {(sleepError || mealError || activityError) && (
            <Alert variant="destructive">
              <AlertTitle>Error Loading Analytics</AlertTitle>
              <AlertDescription>
                {sleepError && <p>Sleep data error: {sleepError}</p>}
                {mealError && <p>Meal data error: {mealError}</p>}
                {activityError && <p>Activity data error: {activityError}</p>}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sleep Trends (Last 30 Days)</CardTitle>
              <CardDescription>Total nap duration per day in minutes.</CardDescription>
            </CardHeader>
            <CardContent>
              {isSleepLoading ? (
                 <div className="flex justify-center items-center h-72"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : sleepData.length > 0 ? (
                <ChartContainer config={sleepChartConfig} className="h-72 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sleepData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} // Ensure UTC interpretation
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        label={{ value: 'Minutes', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle' } }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      {/* <Legend /> */}
                      <Line
                        dataKey="totalMinutes"
                        type="monotone"
                        stroke={sleepChartConfig.totalMinutes.color}
                        strokeWidth={2}
                        dot={false}
                        name={sleepChartConfig.totalMinutes.label}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="text-center text-gray-500 h-72 flex items-center justify-center">No sleep data available for the selected period.</p>
              )}
            </CardContent>
          </Card>

          {/* Placeholder for Meal Analytics */}
          {/* Meal Analytics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Meal Analytics (Last 30 Days)</CardTitle>
              <CardDescription>Frequency and types of meals.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meal Frequency Chart */}
              <div>
                <h3 className="text-md font-semibold mb-2 text-center">Meals per Day</h3>
                {isMealLoading ? (
                  <div className="flex justify-center items-center h-60"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : mealData?.frequency && mealData.frequency.length > 0 ? (
                  <ChartContainer config={mealFreqChartConfig} className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mealData.frequency} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis dataKey="count" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Line dataKey="count" type="monotone" stroke={mealFreqChartConfig.count.color} strokeWidth={2} dot={false} name={mealFreqChartConfig.count.label} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-gray-500 h-60 flex items-center justify-center">No meal frequency data.</p>
                )}
              </div>
              {/* Meal Breakdown Chart */}
              <div>
                <h3 className="text-md font-semibold mb-2 text-center">Meal Type Breakdown</h3>
                {isMealLoading ? (
                  <div className="flex justify-center items-center h-60"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : mealData?.breakdown && mealData.breakdown.length > 0 ? (
                  <ChartContainer config={mealBreakdownChartConfig} className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={mealData.breakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50} // Make it a donut chart
                          fill="var(--color-value)"
                          labelLine={false}
                          // label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} // Optional label on slice
                        >
                           <LabelList
                            dataKey="value" // Show count in label
                            className="fill-background"
                            stroke="none"
                            fontSize={12}
                            formatter={(value: number) => value.toString()} // Format label as count
                            position="inside" // Position label inside slice
                          />
                          {mealData.breakdown.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={mealBreakdownChartConfig[entry.name]?.color || '#8884d8'} />
                          ))}
                        </Pie>
                         <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" height={40} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-gray-500 h-60 flex items-center justify-center">No meal breakdown data.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for Activity Analytics */}
          {/* Activity Analytics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Analytics (Last 30 Days)</CardTitle>
              <CardDescription>Frequency, types, and patterns of activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Activity Frequency Chart */}
              <div>
                <h3 className="text-md font-semibold mb-2">Activities per Day</h3>
                {isActivityLoading ? (
                  <div className="flex justify-center items-center h-60"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : activityData?.frequency && activityData.frequency.length > 0 ? (
                  <ChartContainer config={{ count: { label: "Activities", color: "hsl(var(--chart-3))" } }} className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData.frequency} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis dataKey="count" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Line dataKey="count" type="monotone" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Activities per Day" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-gray-500 h-60 flex items-center justify-center">No activity frequency data.</p>
                )}
              </div>

              {/* Activity Breakdown and Heatmap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Activity Breakdown Chart */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Top Activity Types</h3>
                  {isActivityLoading ? (
                    <div className="flex justify-center items-center h-60"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : activityData?.breakdown && activityData.breakdown.length > 0 ? (
                    <ChartContainer config={activityBreakdownChartConfig} className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={activityData.breakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
                            fill="var(--color-value)"
                            labelLine={false}
                          >
                            <LabelList
                              dataKey="value"
                              className="fill-background"
                              stroke="none"
                              fontSize={12}
                              formatter={(value: number) => value.toString()}
                              position="inside"
                            />
                            {activityData.breakdown.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={activityBreakdownChartConfig[entry.name]?.color || '#8884d8'} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" height={40} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-center text-gray-500 h-60 flex items-center justify-center">No activity breakdown data.</p>
                  )}
                </div>

                {/* Activity Heatmap */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Activity Patterns by Day</h3>
                  {isActivityLoading ? (
                    <div className="flex justify-center items-center h-60"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : activityData?.heatmap && activityData.heatmap.length > 0 ? (
                    <div className="h-60 w-full overflow-auto">
                      <div className="min-w-max">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="border p-2">Day</th>
                              {activityData.activityTypes.map(activity => (
                                <th key={activity} className="border p-2 text-xs truncate max-w-[100px]">
                                  {activity}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activityData.heatmap.map((dayData) => {
                              const maxCount = Math.max(...activityData.activityTypes.map(
                                activity => dayData[activity] || 0
                              ));
                              return (
                                <tr key={dayData.day}>
                                  <td className="border p-2 font-medium">{dayData.day}</td>
                                  {activityData.activityTypes.map(activity => {
                                    const count = dayData[activity] || 0;
                                    return (
                                      <td 
                                        key={`${dayData.day}-${activity}`}
                                        className="border p-2 text-center"
                                        style={{ 
                                          backgroundColor: getHeatmapColor(count, maxCount),
                                          color: count > maxCount / 2 ? 'white' : 'black'
                                        }}
                                      >
                                        {count > 0 ? count : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 h-60 flex items-center justify-center">No activity pattern data.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
