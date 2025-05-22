"use client";

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MoreVertical,
  Smile,
  Utensils,
  Bed,
  ToyBrick,
  CheckCircle,
  MessageSquare,
  Plus,
} from 'lucide-react';
// import Link from 'next/link'; // Assuming View Log / Add Entry might become links

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface QuickLogCardProps {}

function QuickLogCardComponent({}: QuickLogCardProps) {
  return (
    <Card className="md:col-span-1 lg:col-span-1 bg-green-50">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-base font-medium text-green-800">Quick Log</CardTitle>
        <Button variant="ghost" size="icon" aria-label="Options for Quick Log">
          <MoreVertical className="h-5 w-5 text-green-700" />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <Utensils className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Meal</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <Bed className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Nap</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <ToyBrick className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Activity</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <Smile className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Mood</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <MessageSquare className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Note</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-16 items-center justify-center bg-white border-green-200 hover:bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs">Diaper</span>
          </Button>
        </div>
        <div className="flex gap-3">
          <Button className="flex-1 bg-orange-400 hover:bg-orange-500 text-white">
            View Log
          </Button>
          {/* Example of how it might become a Link if needed
          <Button asChild className="flex-1 bg-orange-400 hover:bg-orange-500 text-white">
            <Link href="/log/view">View Log</Link>
          </Button>
          */}
          <Button variant="outline" className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50">
            <Plus className="mr-1 h-4 w-4" /> Add Entry
          </Button>
           {/* Example of how it might become a Link if needed
           <Button asChild variant="outline" className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50">
            <Link href="/log/add"><Plus className="mr-1 h-4 w-4" /> Add Entry</Link>
          </Button>
          */}
        </div>
      </CardContent>
    </Card>
  );
}

export const QuickLogCard = memo(QuickLogCardComponent);
QuickLogCard.displayName = 'QuickLogCard';
