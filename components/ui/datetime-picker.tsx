'use client';

import * as React from 'react';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  disabled?: boolean;
}

export function DateTimePicker({ date, setDate, disabled }: DateTimePickerProps) {
  return (
    <Input
      type="datetime-local"
      value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ''}
      onChange={(e) => {
        const value = e.target.value;
        const parsed = value ? new Date(value) : null;
        if (parsed && !isNaN(parsed.getTime())) {
          setDate(parsed);
        } else {
          setDate(null);
        }
      }}
      disabled={disabled}
    />
  );
}
