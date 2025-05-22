"use client";

import React, { useState, useEffect } from 'react';
import { format, setHours, setMinutes } from 'date-fns'; // Removed 'parse' as it's not used in the provided example
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input'; // For time parts
// Label is not used in the provided example
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateTimePickerProps {
  date: Date | null | undefined;
  setDate: (date: Date | null) => void;
  disabled?: boolean;
}

export function DateTimePicker({ date, setDate, disabled }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date ?? undefined);
  const [hours, setHoursStr] = useState<string>(date ? format(date, 'HH') : '00');
  const [minutes, setMinutesStr] = useState<string>(date ? format(date, 'mm') : '00');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Update internal state if the prop changes
    setSelectedDate(date ?? undefined);
    setHoursStr(date ? format(date, 'HH') : '00');
    setMinutesStr(date ? format(date, 'mm') : '00');
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    // setSelectedDate(newDate); // This will be set by the useEffect when date prop changes via setDate
    if (newDate) {
      const currentHours = parseInt(hours, 10) || 0;
      const currentMinutes = parseInt(minutes, 10) || 0;
      let combined = setHours(newDate, currentHours);
      combined = setMinutes(combined, currentMinutes);
      setDate(combined);
    } else {
      setDate(null);
    }
  };

  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    let numValue = parseInt(value, 10);
    let newHours = hours;
    let newMinutes = minutes;

    if (type === 'hours') {
      if (isNaN(numValue) || numValue < 0) numValue = 0;
      if (numValue > 23) numValue = 23;
      newHours = numValue.toString().padStart(2, '0');
      setHoursStr(newHours);
    } else {
      if (isNaN(numValue) || numValue < 0) numValue = 0;
      if (numValue > 59) numValue = 59;
      newMinutes = numValue.toString().padStart(2, '0');
      setMinutesStr(newMinutes);
    }

    if (selectedDate) {
      const currentHoursVal = parseInt(newHours, 10) || 0;
      const currentMinutesVal = parseInt(newMinutes, 10) || 0;
      let combined = setHours(selectedDate, currentHoursVal);
      combined = setMinutes(combined, currentMinutesVal);
      setDate(combined); // Update the main date prop
    }
  };
  
  const handleApply = () => {
     if (selectedDate) {
         const currentHours = parseInt(hours, 10) || 0;
         const currentMinutes = parseInt(minutes, 10) || 0;
         let combined = setHours(selectedDate, currentHours);
         combined = setMinutes(combined, currentMinutes);
         setDate(combined);
     } else {
         setDate(null); // Or handle as an error / invalid state
     }
     setIsOpen(false); // Close popover on apply
  };


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP HH:mm') : <span>Pick a date and time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="p-4 border-t border-border">
          <p className="text-sm font-medium mb-2">Time</p>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              min="0" max="23"
              value={hours}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange('hours', e.target.value)}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => setHoursStr(e.target.value.padStart(2, '0'))} // Ensure padding on blur
              className="w-[60px]"
              disabled={disabled || !selectedDate}
            /> <span>:</span>
            <Input
              type="number"
              min="0" max="59"
              value={minutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange('minutes', e.target.value)}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => setMinutesStr(e.target.value.padStart(2, '0'))} // Ensure padding on blur
              className="w-[60px]"
              disabled={disabled || !selectedDate}
            />
          </div>
          <Button onClick={handleApply} className="mt-4 w-full" disabled={!selectedDate}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
