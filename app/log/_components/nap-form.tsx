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
// TODO: Add Date/Time Picker component if not already available
// import { DateTimePicker } from '@/components/ui/datetime-picker';

// Define the schema for validation
const napFormSchema = z.object({
  startTime: z.date({
    required_error: 'Start time is required.',
  }),
  endTime: z.date({
    required_error: 'End time is required.',
  }),
  notes: z.string().optional(),
});

type NapFormValues = z.infer<typeof napFormSchema>;

interface NapFormProps {
  childId: string; // Accept childId as a prop
}

export default function NapForm({ childId }: NapFormProps) { // Use the prop
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NapFormValues>({
    resolver: zodResolver(napFormSchema),
    // defaultValues: { // Set default times if desired
    //   startTime: new Date(),
    //   endTime: new Date(),
    // },
  });

  async function onSubmit(data: NapFormValues) {
    if (!childId) {
        toast({
            title: 'Error',
            description: 'Child ID is missing. Please select a child.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);
    console.log('Submitting Nap Data:', { ...data, childId });

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nap', // Match the API schema discriminator
          childId: childId,
          startTime: data.startTime.toISOString(), // Send as ISO string
          endTime: data.endTime.toISOString(),     // Send as ISO string
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Nap Logged',
        description: result.message || 'The nap details have been saved.',
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error logging nap:', error);
      toast({
        title: 'Error Logging Nap',
        description: error instanceof Error ? error.message : 'Could not save nap details. Please try again.',
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
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                {/* Using Input type="datetime-local" as a temporary measure */}
                {/* Need to handle value conversion carefully if using datetime-local */}
                <Input
                  type="datetime-local"
                  onChange={(e) => {
                    // Ensure a valid date is created before calling field.onChange
                    const dateValue = e.target.value ? new Date(e.target.value) : null;
                    if (dateValue && !isNaN(dateValue.getTime())) {
                      field.onChange(dateValue);
                    } else {
                      field.onChange(null); // Or handle invalid input appropriately
                    }
                  }}
                  // value={field.value ? field.value.toISOString().slice(0, 16) : ''} // Formatting for datetime-local
                  disabled={isLoading}
                />
                {/* <DateTimePicker date={field.value} setDate={field.onChange} disabled={isLoading} /> */}
              </FormControl>
              <FormDescription>When the nap started.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
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
                  // value={field.value ? field.value.toISOString().slice(0, 16) : ''} // Formatting for datetime-local
                  disabled={isLoading}
                />
                {/* <DateTimePicker date={field.value} setDate={field.onChange} disabled={isLoading} /> */}
              </FormControl>
              <FormDescription>When the nap ended.</FormDescription>
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
                  placeholder="Any details about the nap..."
                  // Ensure field.value is not null/undefined before passing to Textarea
                  value={field.value ?? ''}
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
          {isLoading ? 'Logging...' : 'Log Nap'}
        </Button>
      </form>
    </Form>
  );
}
