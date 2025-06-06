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

// Define the schema for validation
const activityFormSchema = z.object({
  time: z.date({
    required_error: 'Time is required.',
  }),
  description: z.string().min(1, 'Activity description is required.'), // e.g., "Tummy time", "Read books", "Played outside"
  notes: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

// Accept childId as a prop
interface ActivityFormProps {
  childId: string;
}

export default function ActivityForm({ childId }: ActivityFormProps) { // Use the prop
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    // defaultValues: { // Set default time if desired
    //   time: new Date(),
    // },
  });

  async function onSubmit(data: ActivityFormValues) {
    if (!childId) {
        toast({
            title: 'Error',
            description: 'Child ID is missing. Please select a child.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'activity', // API discriminator
          childId: childId,
          time: data.time.toISOString(),
          description: data.description,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Activity Logged',
        description: result.message || 'The activity details have been saved.',
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      logger.error({ err: error }, 'Error logging activity');
      toast({
        title: 'Error Logging Activity',
        description: error instanceof Error ? error.message : 'Could not save activity details. Please try again.',
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
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time</FormLabel>
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
              <FormDescription>When the activity occurred.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Tummy time, Read 'Goodnight Moon'"
                  {...field}
                  value={field.value ?? ''} // Handle potential null/undefined
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>What the activity was.</FormDescription>
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
                  placeholder="Any details about the activity..."
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
          {isLoading ? 'Logging...' : 'Log Activity'}
        </Button>
      </form>
    </Form>
  );
}
