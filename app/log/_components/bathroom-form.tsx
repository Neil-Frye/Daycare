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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
// TODO: Add Date/Time Picker component if not already available
// import { DateTimePicker } from '@/components/ui/datetime-picker';

// Define the schema for validation
const bathroomFormSchema = z.object({
  time: z.date({
    required_error: 'Time is required.',
  }),
  type: z.enum(['wet', 'dirty', 'dry', 'potty_attempt'], { // Keep 'type' for form state
    required_error: 'Please select event type.',
  }),
  notes: z.string().optional(),
});

type BathroomFormValues = z.infer<typeof bathroomFormSchema>;

// Accept childId as a prop
interface BathroomFormProps {
  childId: string;
}

export default function BathroomForm({ childId }: BathroomFormProps) { // Use the prop
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BathroomFormValues>({
    resolver: zodResolver(bathroomFormSchema),
    // defaultValues: { // Set default time if desired
    //   time: new Date(),
    // },
  });

  async function onSubmit(data: BathroomFormValues) {
    if (!childId) {
        toast({
            title: 'Error',
            description: 'Child ID is missing. Please select a child.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);
    console.log('Submitting Bathroom Data:', { ...data, childId });

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bathroom', // API discriminator
          childId: childId,
          time: data.time.toISOString(),
          eventType: data.type, // Map form 'type' to API 'eventType'
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Bathroom Event Logged',
        description: result.message || 'The event details have been saved.',
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error logging bathroom event:', error);
      toast({
        title: 'Error Logging Bathroom Event',
        description: error instanceof Error ? error.message : 'Could not save event details. Please try again.',
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
              <FormDescription>When the bathroom event occurred.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type" // Form field name remains 'type'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="wet">Wet Diaper</SelectItem>
                  <SelectItem value="dirty">Dirty Diaper (BM)</SelectItem>
                  <SelectItem value="dry">Dry Diaper</SelectItem>
                  <SelectItem value="potty_attempt">Potty Attempt</SelectItem>
                </SelectContent>
              </Select>
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
                  placeholder="Any details about the event..."
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
          {isLoading ? 'Logging...' : 'Log Bathroom Event'}
        </Button>
      </form>
    </Form>
  );
}
