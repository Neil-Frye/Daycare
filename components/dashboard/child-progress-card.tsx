"use client";

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Not directly used in this card's content but often part of Card structures
import { MoreVertical } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress'; // Import from new location

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ChildProgressCardProps {}

function ChildProgressCardComponent({}: ChildProgressCardProps) {
  return (
    <Card className="md:col-span-1 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <div>
            <CardTitle className="text-base font-medium">Child Progress</CardTitle>
            <CardDescription className="text-xs">Summary</CardDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="Options for Child Progress">
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex justify-around items-center">
        {/* Placeholder Circular Progress */}
        <CircularProgress value="1/8" label="Meals" />
        <CircularProgress value="927" label="Steps" />
        <CircularProgress value="122" label="Mins Nap" />
      </CardContent>
    </Card>
  );
}

export const ChildProgressCard = memo(ChildProgressCardComponent);
ChildProgressCard.displayName = 'ChildProgressCard';
