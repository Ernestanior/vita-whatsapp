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
          digest_time?: string
          quick_mode?: boolean
          created_at?: string
          updated_at?: string
        }
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
  }
}
