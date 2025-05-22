"use client";

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Not used in this card directly, but good for consistency if actions were added
import { CircleUserRound, CheckCircle, Clock, MoreVertical } from 'lucide-react'; // Added MoreVertical if header actions are desired

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TodaysScheduleCardProps {}

function TodaysScheduleCardComponent({}: TodaysScheduleCardProps) {
  return (
    <Card className="md:col-span-1 lg:col-span-1">
      <CardHeader className="flex flex-row items-center gap-2 p-3">
        <CircleUserRound className="h-6 w-6 text-orange-500" />
        <CardTitle className="text-base font-medium">Today's Schedule</CardTitle>
        {/* Optional: Add a menu or action button to the header 
        <Button variant="ghost" size="icon" className="ml-auto">
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </Button>
        */}
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Placeholder Schedule Items */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">1</span>
                <span className="text-sm">Activity Name</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>5 mins</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
        </div>
         <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">2</span>
                <span className="text-sm">Diaper Change</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>10 mins ago</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
        </div>
         <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">3</span>
                <span className="text-sm">Nap Time</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Upcoming</span>
                <Clock className="h-4 w-4 text-blue-500" />
            </div>
        </div>
        {/* Add illustration placeholder if needed */}
        {/* <div className="mt-2 h-20 bg-orange-100 rounded flex items-center justify-center text-orange-400">Illustration Placeholder</div> */}
      </CardContent>
    </Card>
  );
}

export const TodaysScheduleCard = memo(TodaysScheduleCardComponent);
TodaysScheduleCard.displayName = 'TodaysScheduleCard';
