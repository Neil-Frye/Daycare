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
const mealFormSchema = z.object({
  time: z.date({
    required_error: 'Time is required.',
  }),
  type: z.enum(['bottle', 'solid_food'], { // Keep 'type' for form state
    required_error: 'Please select meal type.',
  }),
  foodDetails: z.string().min(1, 'Food details are required.'), // e.g., "Formula", "Oatmeal with Banana"
  amount: z.string().optional(), // e.g., "120ml", "1/2 cup"
  notes: z.string().optional(),
});

type MealFormValues = z.infer<typeof mealFormSchema>;

// Accept childId as a prop
interface MealFormProps {
  childId: string;
}

export default function MealForm({ childId }: MealFormProps) { // Use the prop
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    // defaultValues: { // Set default time if desired
    //   time: new Date(),
    // },
  });

  async function onSubmit(data: MealFormValues) {
    if (!childId) {
        toast({
            title: 'Error',
            description: 'Child ID is missing. Please select a child.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);
    console.log('Submitting Meal/Bottle Data:', { ...data, childId });

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'meal', // API discriminator
          childId: childId,
          time: data.time.toISOString(),
          mealType: data.type, // Map form 'type' to API 'mealType'
          foodDetails: data.foodDetails,
          amount: data.amount,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Meal/Bottle Logged',
        description: result.message || 'The feeding details have been saved.',
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Error logging meal/bottle:', error);
      toast({
        title: 'Error Logging Meal/Bottle',
        description: error instanceof Error ? error.message : 'Could not save feeding details. Please try again.',
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
              <FormDescription>When the meal/bottle occurred.</FormDescription>
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
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bottle">Bottle (Formula/Milk)</SelectItem>
                  <SelectItem value="solid_food">Solid Food</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="foodDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Food/Formula Details</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Similac Pro-Advance, Oatmeal with Banana"
                  {...field}
                  value={field.value ?? ''} // Handle potential null/undefined
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>Specify the type of food or formula.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., 120ml, 4oz, 1/2 cup"
                  {...field}
                  value={field.value ?? ''} // Handle potential null/undefined
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>How much was consumed.</FormDescription>
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
                  placeholder="Any details about the feeding..."
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
          {isLoading ? 'Logging...' : 'Log Meal/Bottle'}
        </Button>
      </form>
    </Form>
  );
}
