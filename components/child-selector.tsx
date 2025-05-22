"use client";

import React, { memo } from 'react'; // Added memo
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Tables } from '@/lib/supabase/types';

type Child = Tables<'children'>;

interface ChildSelectorProps {
  children: Child[];
  selectedChildId: string | null;
  onChildChange: (childId: string) => void;
  placeholder?: string;
  className?: string;
}

// Original component, renamed to avoid export conflict
function ChildSelectorComponent({
  children,
  selectedChildId,
  onChildChange,
  placeholder = "Select a child",
  className = "w-[200px]",
}: ChildSelectorProps) {

  if (children.length === 0) {
    return (
       <div className={`${className} h-10 flex items-center justify-center border rounded-md`}>
         <span className="text-sm text-gray-500">No children available</span>
       </div>
    );
  }

  return (
    <Select
      value={selectedChildId ?? ""}
      onValueChange={(value) => {
        if (value) {
            onChildChange(value);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Export the memoized version with the original name
export const ChildSelector = memo(ChildSelectorComponent);
