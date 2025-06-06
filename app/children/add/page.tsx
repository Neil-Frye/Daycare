"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import logger from '@/lib/logger'

export default function AddChildPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    gender: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClientComponentClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add child')
      }

      toast({
        title: "Child added successfully",
        description: `${formData.name} has been added to your account.`,
      })
      router.push('/')
    } catch (error) {
      logger.error({ err: error }, 'Submission error');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add child",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">Add a Child</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="child-name">Full Name</Label>
          <Input
            id="child-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="child-birthdate">Birth Date</Label>
          <Input
            id="child-birthdate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
            autoComplete="bday"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="child-gender">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({...formData, gender: value})}
            required
          >
            <SelectTrigger id="child-gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Child"}
        </Button>
      </form>
    </div>
  )
}
