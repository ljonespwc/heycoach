export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      client_interventions: {
        Row: {
          active: boolean | null
          client_id: string
          coach_disabled: boolean | null
          coach_notes: string | null
          created_at: string
          effectiveness_rating: number | null
          favorite: boolean | null
          id: string
          intervention_id: string
          intervention_type: string
          last_used_at: string | null
          times_used: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          client_id: string
          coach_disabled?: boolean | null
          coach_notes?: string | null
          created_at?: string
          effectiveness_rating?: number | null
          favorite?: boolean | null
          id?: string
          intervention_id: string
          intervention_type: string
          last_used_at?: string | null
          times_used?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          client_id?: string
          coach_disabled?: boolean | null
          coach_notes?: string | null
          created_at?: string
          effectiveness_rating?: number | null
          favorite?: boolean | null
          id?: string
          intervention_id?: string
          intervention_type?: string
          last_used_at?: string | null
          times_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sos_messages: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          incident_type: string
          message_text: string
          message_type: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          incident_type: string
          message_text: string
          message_type?: string
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          incident_type?: string
          message_text?: string
          message_type?: string
          sender_type?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          access_token: string | null
          birth_date: string | null
          coach_id: string
          created_at: string
          current_weight: number | null
          desired_weight: number | null
          email: string | null
          engagement_start_date: string | null
          full_name: string | null
          gender: string | null
          habit_objectives: Json | null
          id: string
          notes: string | null
          status: string | null
          trigger_foods: Json | null
        }
        Insert: {
          access_token?: string | null
          birth_date?: string | null
          coach_id: string
          created_at?: string
          current_weight?: number | null
          desired_weight?: number | null
          email?: string | null
          engagement_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          habit_objectives?: Json | null
          id?: string
          notes?: string | null
          status?: string | null
          trigger_foods?: Json | null
        }
        Update: {
          access_token?: string | null
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          current_weight?: number | null
          desired_weight?: number | null
          email?: string | null
          engagement_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          habit_objectives?: Json | null
          id?: string
          notes?: string | null
          status?: string | null
          trigger_foods?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_settings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          tone_preset: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          tone_preset?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          tone_preset?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_settings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      craving_incidents: {
        Row: {
          client_id: string
          context: string | null
          created_at: string
          day_of_week: number | null
          id: string
          initial_intensity: number | null
          intervention_id: string | null
          location: string | null
          notify_coach: boolean | null
          resolved_at: string | null
          result_rating: number | null
          time_of_day: string | null
          trigger_food: string | null
        }
        Insert: {
          client_id: string
          context?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          initial_intensity?: number | null
          intervention_id?: string | null
          location?: string | null
          notify_coach?: boolean | null
          resolved_at?: string | null
          result_rating?: number | null
          time_of_day?: string | null
          trigger_food?: string | null
        }
        Update: {
          client_id?: string
          context?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          initial_intensity?: number | null
          intervention_id?: string | null
          location?: string | null
          notify_coach?: boolean | null
          resolved_at?: string | null
          result_rating?: number | null
          time_of_day?: string | null
          trigger_food?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "craving_incidents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craving_incidents_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "craving_interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      craving_interventions: {
        Row: {
          active: boolean | null
          category: string | null
          coach_id: string
          context_tags: string[] | null
          created_at: string
          description: string
          id: string
          name: string
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          coach_id: string
          context_tags?: string[] | null
          created_at?: string
          description: string
          id?: string
          name: string
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          coach_id?: string
          context_tags?: string[] | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "craving_interventions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      default_craving_interventions: {
        Row: {
          category: string | null
          context_tags: string[] | null
          description: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          context_tags?: string[] | null
          description: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          context_tags?: string[] | null
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      default_energy_interventions: {
        Row: {
          category: string | null
          context_tags: string[] | null
          description: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          context_tags?: string[] | null
          description: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          context_tags?: string[] | null
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      energy_interventions: {
        Row: {
          active: boolean | null
          category: string | null
          coach_id: string
          context_tags: string[] | null
          created_at: string
          description: string
          id: string
          name: string
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          coach_id: string
          context_tags?: string[] | null
          created_at?: string
          description: string
          id?: string
          name: string
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          coach_id?: string
          context_tags?: string[] | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_interventions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_incidents: {
        Row: {
          activity_completed: boolean | null
          activity_type: string | null
          blocker_type: string | null
          client_id: string
          created_at: string
          day_of_week: number | null
          energy_level: number | null
          id: string
          intervention_id: string | null
          notify_coach: boolean | null
          resolved_at: string | null
          result_rating: number | null
          time_of_day: string | null
        }
        Insert: {
          activity_completed?: boolean | null
          activity_type?: string | null
          blocker_type?: string | null
          client_id: string
          created_at?: string
          day_of_week?: number | null
          energy_level?: number | null
          id?: string
          intervention_id?: string | null
          notify_coach?: boolean | null
          resolved_at?: string | null
          result_rating?: number | null
          time_of_day?: string | null
        }
        Update: {
          activity_completed?: boolean | null
          activity_type?: string | null
          blocker_type?: string | null
          client_id?: string
          created_at?: string
          day_of_week?: number | null
          energy_level?: number | null
          id?: string
          intervention_id?: string | null
          notify_coach?: boolean | null
          resolved_at?: string | null
          result_rating?: number | null
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movement_incidents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_incidents_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "energy_interventions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_owns_message_incident: {
        Args: { msg_incident_id: string; msg_incident_type: string }
        Returns: boolean
      }
      get_client_from_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_intervention_usage: {
        Args: {
          p_client_id: string
          p_intervention_id: string
          p_intervention_type: string
        }
        Returns: undefined
      }
      update_all_intervention_success_rates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_craving_intervention_success_rates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_energy_intervention_success_rates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_intervention_effectiveness: {
        Args: {
          p_client_id: string
          p_intervention_id: string
          p_intervention_type: string
          p_effectiveness_rating: number
        }
        Returns: undefined
      }
      update_specific_intervention_success_rate: {
        Args: { p_intervention_id: string; p_intervention_type: string }
        Returns: undefined
      }
      user_owns_client: {
        Args: { client_id: string }
        Returns: boolean
      }
      user_owns_message_incident: {
        Args: { msg_incident_id: string; msg_incident_type: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const