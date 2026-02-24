/**
 * Database Types
 * 
 * This file contains the database schema types for Supabase.
 * These types are used for type-safe database operations.
 */

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
      users: {
        Row: {
          id: string
          phone_number: string
          whatsapp_name: string | null
          language: 'en' | 'zh-CN' | 'zh-TW'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          whatsapp_name?: string | null
          language?: 'en' | 'zh-CN' | 'zh-TW'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          whatsapp_name?: string | null
          language?: 'en' | 'zh-CN' | 'zh-TW'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          user_id: string
          height: number
          weight: number
          age: number | null
          gender: 'male' | 'female' | null
          goal: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain'
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active'
          training_type: 'none' | 'strength' | 'cardio' | 'mixed'
          protein_target: number | null
          carb_target: number | null
          digest_time: string
          quick_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          height: number
          weight: number
          age?: number | null
          gender?: 'male' | 'female' | null
          goal: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain'
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active'
          training_type?: 'none' | 'strength' | 'cardio' | 'mixed'
          protein_target?: number | null
          carb_target?: number | null
          digest_time?: string
          quick_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          height?: number
          weight?: number
          age?: number | null
          gender?: 'male' | 'female' | null
          goal?: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain'
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active'
          training_type?: 'none' | 'strength' | 'cardio' | 'mixed'
          protein_target?: number | null
          carb_target?: number | null
          digest_time?: string
          quick_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_records: {
        Row: {
          id: string
          user_id: string
          image_url: string
          image_hash: string
          recognition_result: Json
          health_rating: Json
          meal_context: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          image_hash: string
          recognition_result: Json
          health_rating: Json
          meal_context?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          image_hash?: string
          recognition_result?: Json
          health_rating?: Json
          meal_context?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: 'free' | 'premium' | 'pro'
          status: 'active' | 'cancelled' | 'expired'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: 'free' | 'premium' | 'pro'
          status: 'active' | 'cancelled' | 'expired'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'free' | 'premium' | 'pro'
          status?: 'active' | 'cancelled' | 'expired'
          current_period_start?: string
          current_period_end?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_quotas: {
        Row: {
          user_id: string
          date: string
          recognitions_used: number
          recognitions_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          date: string
          recognitions_used?: number
          recognitions_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          date?: string
          recognitions_used?: number
          recognitions_limit?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string
          dietary_type: string[]
          allergies: Json
          eating_habits: Json
          minimal_mode: boolean
          language_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          dietary_type?: string[]
          allergies?: Json
          eating_habits?: Json
          minimal_mode?: boolean
          language_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          dietary_type?: string[]
          allergies?: Json
          eating_habits?: Json
          minimal_mode?: boolean
          language_preference?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_budgets: {
        Row: {
          id: string
          user_id: string
          date: string
          calorie_target: number
          calories_consumed: number
          budget_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          calorie_target: number
          calories_consumed?: number
          budget_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          calorie_target?: number
          calories_consumed?: number
          budget_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_log_date: string | null
          streak_freezes_available: number
          streak_freeze_reset_date: string | null
          comeback_streak: number
          days_active: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_log_date?: string | null
          streak_freezes_available?: number
          streak_freeze_reset_date?: string | null
          comeback_streak?: number
          days_active?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_log_date?: string | null
          streak_freezes_available?: number
          streak_freeze_reset_date?: string | null
          comeback_streak?: number
          days_active?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          achievement_type: string
          achievement_tier: string
          earned_date: string
          metadata: Json
          share_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_type: string
          achievement_tier?: string
          earned_date?: string
          metadata?: Json
          share_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_type?: string
          achievement_tier?: string
          earned_date?: string
          metadata?: Json
          share_count?: number
          created_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          reminder_type: string
          scheduled_time: string
          enabled: boolean
          quiet_hours_start: string
          quiet_hours_end: string
          effectiveness_score: number
          last_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reminder_type: string
          scheduled_time: string
          enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          effectiveness_score?: number
          last_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reminder_type?: string
          scheduled_time?: string
          enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          effectiveness_score?: number
          last_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      visual_cards: {
        Row: {
          id: string
          user_id: string
          card_type: string
          generation_date: string
          image_url: string
          data_snapshot: Json
          share_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_type: string
          generation_date?: string
          image_url: string
          data_snapshot?: Json
          share_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_type?: string
          generation_date?: string
          image_url?: string
          data_snapshot?: Json
          share_count?: number
          created_at?: string
        }
        Relationships: []
      }
      feature_discovery: {
        Row: {
          id: string
          user_id: string
          feature_name: string
          introduction_date: string
          introduction_count: number
          user_engaged: boolean
          last_mentioned_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature_name: string
          introduction_date?: string
          introduction_count?: number
          user_engaged?: boolean
          last_mentioned_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature_name?: string
          introduction_date?: string
          introduction_count?: number
          user_engaged?: boolean
          last_mentioned_date?: string
          created_at?: string
        }
        Relationships: []
      }
      user_engagement_metrics: {
        Row: {
          user_id: string
          total_meals_logged: number
          days_active: number
          features_enabled: string[]
          last_active_date: string | null
          engagement_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          total_meals_logged?: number
          days_active?: number
          features_enabled?: string[]
          last_active_date?: string | null
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_meals_logged?: number
          days_active?: number
          features_enabled?: string[]
          last_active_date?: string | null
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          connection_type: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          connection_type: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          connection_type?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_challenges: {
        Row: {
          id: string
          challenge_type: string
          start_date: string
          end_date: string
          completion_criteria: Json
          participants_count: number
          created_at: string
        }
        Insert: {
          id?: string
          challenge_type: string
          start_date: string
          end_date: string
          completion_criteria?: Json
          participants_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          challenge_type?: string
          start_date?: string
          end_date?: string
          completion_criteria?: Json
          participants_count?: number
          created_at?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          progress_value: number
          completion_status: string
          rank: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          progress_value?: number
          completion_status?: string
          rank?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          progress_value?: number
          completion_status?: string
          rank?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      increment_usage: {
        Args: {
          p_user_id: string
          p_date: string
        }
        Returns: void
      }
      get_user_stats: {
        Args: {
          p_user_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_meals: number
          avg_calories: number
          green_count: number
          yellow_count: number
          red_count: number
        }[]
      }
    }
    Views: {
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
