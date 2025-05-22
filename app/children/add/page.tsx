"use client"

import { useRouter } from "next/navigation"
import { useState } from "react" // useEffect removed as it's not used after refactor
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Label is not directly used, FormLabel is used instead
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription, // Added if needed, but not in example for all fields
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// 1. Define Zod Schema
const addChildFormSchema = z.object({
  name: z.string().min(1, { message: "Full name is required." }),
  birthDate: z.string()
    .refine((val) => val && !isNaN(Date.parse(val)), { message: "Birth date is required and must be valid." })
    .transform((val) => new Date(val).toISOString().split('T')[0]), // Keep as YYYY-MM-DD string
  gender: z.enum(['male', 'female', 'other'], { required_error: "Gender is required." })
});

type AddChildFormValues = z.infer<typeof addChildFormSchema>;

export default function AddChildPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient() // Keep this for session management
  const [isSubmitting, setIsSubmitting] = useState(false) // Keep manual isSubmitting for now

  // 2. Setup useForm
  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildFormSchema),
    defaultValues: {
      name: "",
      birthDate: "", // HTML date input expects YYYY-MM-DD
      gender: undefined,
    },
  });

  // 4. Update handleSubmit Logic
  async function onSubmit(data: AddChildFormValues) {
    setIsSubmitting(true);

    try {
      // const supabase = createClientComponentClient(); // Already initialized above
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session. Please log in.');
      }

      console.log('Submitting validated form data:', data);
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data) // Send validated and transformed data
      });
      
      console.log('Response status:', response.status);
      const responseData: { error?: string; [key: string]: any; } = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add child');
      }

      toast({
        title: "Child added successfully",
        description: `${data.name} has been added to your account.`,
      });
      form.reset(); // Reset form on success
      router.push('/');
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add child",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // formData state and handleChange are no longer needed

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">Add a Child</h1>
      {/* 3. Update Form Structure */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Child's full name" {...field} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birth Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} autoComplete="bday" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Child"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
