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
import { Input } from '@/components/ui/input'; // Keep for other fields
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { DateTimePicker } from '@/components/ui/datetime-picker'; // Import the new component

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
    // 1. Store form data and reset early
    const currentFormData = form.getValues(); // Get all values
    form.reset(); // Optimistically reset the form
    setIsLoading(true); // Keep loading state for button
    
    // Optional: show a temporary "Submitting..." toast
    // toast({ title: "Submitting activity..." });
    console.log('Submitting Activity Data (optimistic):', { ...currentFormData, childId });

    try {
      // 2. API Call (use currentFormData)
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'activity',
          childId: childId,
          time: currentFormData.time.toISOString(), // Use stored data
          description: currentFormData.description,
          notes: currentFormData.notes,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string; [key: string]: any; } = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // 3. Success Handling
      const result: { message?: string; [key: string]: any; } = await response.json();
      toast({
        title: 'Activity Logged',
        description: result.message || 'The activity details have been saved.',
      });
      // Form is already reset. If you had a specific "Submitting" toast, clear it.

    } catch (error) {
      // 4. Error Handling and Reversion
      console.error('Error logging activity:', error);
      toast({
        title: 'Error Logging Activity',
        description: error instanceof Error ? error.message : 'Could not save. Please try again.',
        variant: 'destructive',
      });
      form.reset(currentFormData); // Restore form data on error
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
                <DateTimePicker
                  date={field.value}
                  setDate={field.onChange}
                  disabled={isLoading}
                />
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
