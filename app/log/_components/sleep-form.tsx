'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
// TODO: Add Date/Time Picker component if not already available
// import { DateTimePicker } from '@/components/ui/datetime-picker';

// Define the schema for validation (same as nap for now)
const sleepFormSchema = z.object({
  startTime: z.date({
    required_error: 'Start time is required.',
  }),
  endTime: z.date({
    required_error: 'End time is required.',
  }),
  notes: z.string().optional(),
});

type SleepFormValues = z.infer<typeof sleepFormSchema>;

// Accept childId as a prop
interface SleepFormProps {
  childId: string;
}

export default function SleepForm({ childId }: SleepFormProps) { // Use the prop
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SleepFormValues>({
    resolver: zodResolver(sleepFormSchema),
    // defaultValues: { // Set default times if desired
    //   startTime: new Date(), // Sensible default might be evening
    //   endTime: new Date(),   // Sensible default might be morning
    // },
  });

  async function onSubmit(data: SleepFormValues) {
    if (!childId) {
        toast({
            title: 'Error',
            description: 'Child ID is missing. Please select a child.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);

    // Using 'nap' type for API call as the backend currently handles both nap/sleep under 'nap'
    // If distinct handling is needed later, update API and type here.
    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nap', // Using 'nap' type for the API endpoint
          childId: childId,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Sleep Logged',
        description: result.message || 'The sleep details have been saved.',
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      logger.error({ err: error }, 'Error logging sleep');
      toast({
        title: 'Error Logging Sleep',
        description: error instanceof Error ? error.message : 'Could not save sleep details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* TODO: Replace Input with DateTimePicker when available */}
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bedtime</FormLabel>
              <FormControl>
                {/* Using Input type="datetime-local" as a temporary measure */}
                <Input
                  type="datetime-local"
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value) : null;
                    if (dateValue && !isNaN(dateValue.getTime())) {
                      field.onChange(dateValue);
                    } else {
                      field.onChange(null);
                    }
                  }}
                  // value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                  disabled={isLoading}
                />
                {/* <DateTimePicker date={field.value} setDate={field.onChange} disabled={isLoading} /> */}
              </FormControl>
              <FormDescription>When the child went to sleep.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wake-up Time</FormLabel>
              <FormControl>
                 {/* Using Input type="datetime-local" as a temporary measure */}
                 <Input
                  type="datetime-local"
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value) : null;
                    if (dateValue && !isNaN(dateValue.getTime())) {
                      field.onChange(dateValue);
                    } else {
                      field.onChange(null);
                    }
                  }}
                  // value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                  disabled={isLoading}
                />
                {/* <DateTimePicker date={field.value} setDate={field.onChange} disabled={isLoading} /> */}
              </FormControl>
              <FormDescription>When the child woke up.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any details about the night's sleep..."
                  value={field.value ?? ''} // Handle potential null/undefined
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading || !childId}>
          {isLoading ? 'Logging...' : 'Log Sleep'}
        </Button>
      </form>
    </Form>
  );
}
