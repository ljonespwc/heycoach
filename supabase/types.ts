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
      coaches: {
        Row: {
          id: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          created_at?: string
        }
      }
      coach_settings: {
        Row: {
          id: string
          coach_id: string
          tone_preset: string
          custom_responses: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          tone_preset?: string
          custom_responses?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          tone_preset?: string
          custom_responses?: Json | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          coach_id: string
          full_name: string | null
          weight_goal: number | null
          habit_objectives: Json | null
          created_at: string
        }
        Insert: {
          id: string
          coach_id: string
          full_name?: string | null
          weight_goal?: number | null
          habit_objectives?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          full_name?: string | null
          weight_goal?: number | null
          habit_objectives?: Json | null
          created_at?: string
        }
      }
      craving_interventions: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string
          category: string | null
          duration_minutes: number | null
          intensity_range: Json | null
          context_tags: string[] | null
          success_rate: number | null
          active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description: string
          category?: string | null
          duration_minutes?: number | null
          intensity_range?: Json | null
          context_tags?: string[] | null
          success_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string
          category?: string | null
          duration_minutes?: number | null
          intensity_range?: Json | null
          context_tags?: string[] | null
          success_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      energy_interventions: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string
          category: string | null
          duration_minutes: number | null
          energy_level_range: Json | null
          intensity_level: string | null
          equipment_needed: string[] | null
          success_rate: number | null
          active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description: string
          category?: string | null
          duration_minutes?: number | null
          energy_level_range?: Json | null
          intensity_level?: string | null
          equipment_needed?: string[] | null
          success_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string
          category?: string | null
          duration_minutes?: number | null
          energy_level_range?: Json | null
          intensity_level?: string | null
          equipment_needed?: string[] | null
          success_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      trigger_foods: {
        Row: {
          id: string
          client_id: string
          food_name: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          food_name: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          food_name?: string
          category?: string | null
          created_at?: string
        }
      }
      craving_incidents: {
        Row: {
          id: string
          client_id: string
          trigger_food_id: string | null
          initial_intensity: number | null
          final_intensity: number | null
          location: string | null
          context: string | null
          tactic_used: string | null
          created_at: string
          resolved_at: string | null
          intervention_id: string | null
          notify_coach: boolean | null
          day_of_week: number | null
          time_of_day: string | null
        }
        Insert: {
          id?: string
          client_id: string
          trigger_food_id?: string | null
          initial_intensity?: number | null
          final_intensity?: number | null
          location?: string | null
          context?: string | null
          tactic_used?: string | null
          created_at?: string
          resolved_at?: string | null
          intervention_id?: string | null
          notify_coach?: boolean | null
          day_of_week?: number | null
          time_of_day?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          trigger_food_id?: string | null
          initial_intensity?: number | null
          final_intensity?: number | null
          location?: string | null
          context?: string | null
          tactic_used?: string | null
          created_at?: string
          resolved_at?: string | null
          intervention_id?: string | null
          notify_coach?: boolean | null
          day_of_week?: number | null
          time_of_day?: string | null
        }
      }
      movement_incidents: {
        Row: {
          id: string
          client_id: string
          blocker_type: string
          energy_level: number | null
          activity_completed: boolean | null
          activity_type: string | null
          duration_minutes: number | null
          created_at: string
          intervention_id: string | null
          notify_coach: boolean | null
          day_of_week: number | null
          time_of_day: string | null
          post_energy_level: number | null
        }
        Insert: {
          id?: string
          client_id: string
          blocker_type: string
          energy_level?: number | null
          activity_completed?: boolean | null
          activity_type?: string | null
          duration_minutes?: number | null
          created_at?: string
          intervention_id?: string | null
          notify_coach?: boolean | null
          day_of_week?: number | null
          time_of_day?: string | null
          post_energy_level?: number | null
        }
        Update: {
          id?: string
          client_id?: string
          blocker_type?: string
          energy_level?: number | null
          activity_completed?: boolean | null
          activity_type?: string | null
          duration_minutes?: number | null
          created_at?: string
          intervention_id?: string | null
          notify_coach?: boolean | null
          day_of_week?: number | null
          time_of_day?: string | null
          post_energy_level?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
