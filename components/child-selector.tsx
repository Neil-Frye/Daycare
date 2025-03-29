"use client";

import React from 'react'; // Removed useState, useEffect
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Removed supabase import as it's no longer needed here
import { type Database, type Tables } from '@/lib/supabase/types'; // Keep type import

// Use the generated type
type Child = Tables<'children'>;

// Updated props interface
interface ChildSelectorProps {
  children: Child[]; // Accept children list as prop
  selectedChildId: string | null; // Accept selected ID as prop
  onChildChange: (childId: string) => void; // Renamed prop for clarity
  // Add optional placeholder prop if needed
  placeholder?: string;
  className?: string; // Allow passing className
}

export function ChildSelector({
  children,
  selectedChildId,
  onChildChange,
  placeholder = "Select a child",
  className = "w-[200px]", // Default width
}: ChildSelectorProps) {

  // Loading state and error handling should be managed by the parent component

  if (children.length === 0) {
    // Parent should handle the case where there are no children to pass
    // Or display a minimal state here
    return (
       <div className={`${className} h-10 flex items-center justify-center border rounded-md`}>
         <span className="text-sm text-gray-500">No children available</span>
       </div>
    );
  }

  return (
    <Select
      // Use the selectedChildId prop, ensuring it's a string or undefined for the Select component
      value={selectedChildId ?? ""}
      onValueChange={(value) => {
        // Call the callback function passed from the parent
        if (value) { // Ensure value is not empty string if placeholder is selected
            onChildChange(value);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Map over the children prop */}
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
