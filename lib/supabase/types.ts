export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      children: {
        Row: {
          id: string
          name: string
          birth_date: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          birth_date: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          birth_date?: string
          user_id?: string
          created_at?: string
        }
      }
      daily_reports: {
        Row: {
          id: string
          child_id: string
          date: string
          category: string
          type: string
          duration: string | null
          time: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          date: string
          category: string
          type: string
          duration?: string | null
          time: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          date?: string
          category?: string
          type?: string
          duration?: string | null
          time?: string
          notes?: string | null
          created_at?: string
        }
      }
      daycare_events: {
        Row: {
          id: string
          center_name: string
          event_date: string
          event_type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          center_name: string
          event_date: string
          event_type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          center_name?: string
          event_date?: string
          event_type?: string
          description?: string | null
          created_at?: string
        }
      }
    }
  }
}