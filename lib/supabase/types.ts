export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          child_id: string | null
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          report_id: string | null
          source: string
          time: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          report_id?: string | null
          source?: string
          time?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          report_id?: string | null
          source?: string
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bathroom_events: {
        Row: {
          child_id: string | null
          created_at: string | null
          event_time: string | null
          id: string
          initials: string[] | null
          legacy_event_type: string | null
          notes: string | null
          report_id: string | null
          source: string
          type: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          event_time?: string | null
          id?: string
          initials?: string[] | null
          legacy_event_type?: string | null
          notes?: string | null
          report_id?: string | null
          source?: string
          type?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          event_time?: string | null
          id?: string
          initials?: string[] | null
          legacy_event_type?: string | null
          notes?: string | null
          report_id?: string | null
          source?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bathroom_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bathroom_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string
          created_at: string | null
          gender: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          child_id: string
          child_name_from_report: string | null
          created_at: string | null
          date: string
          gmail_message_id: string | null
          id: string
          report_date_from_report: string | null
          teacher_notes: string | null
        }
        Insert: {
          child_id: string
          child_name_from_report?: string | null
          created_at?: string | null
          date: string
          gmail_message_id?: string | null
          id?: string
          report_date_from_report?: string | null
          teacher_notes?: string | null
        }
        Update: {
          child_id?: string
          child_name_from_report?: string | null
          created_at?: string | null
          date?: string
          gmail_message_id?: string | null
          id?: string
          report_date_from_report?: string | null
          teacher_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_events: {
        Row: {
          center_name: string
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
        }
        Insert: {
          center_name: string
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
        }
        Update: {
          center_name?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          child_id: string
          created_at: string
          id: string
          invitee_email: string
          inviter_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invites_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          child_id: string | null
          created_at: string | null
          details: string | null
          food_description: string | null
          id: string
          initials: string[] | null
          meal_time: string | null
          notes: string | null
          report_id: string | null
          source: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          details?: string | null
          food_description?: string | null
          id?: string
          initials?: string[] | null
          meal_time?: string | null
          notes?: string | null
          report_id?: string | null
          source?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          details?: string | null
          food_description?: string | null
          id?: string
          initials?: string[] | null
          meal_time?: string | null
          notes?: string | null
          report_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      naps: {
        Row: {
          child_id: string | null
          created_at: string | null
          duration_text: string | null
          end_time: string | null
          id: string
          notes: string | null
          report_id: string | null
          source: string
          start_time: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          duration_text?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          report_id?: string | null
          source?: string
          start_time?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          duration_text?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          report_id?: string | null
          source?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naps_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          report_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          report_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invite_status: "pending" | "accepted" | "declined"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invite_status: ["pending", "accepted", "declined"],
    },
  },
} as const
