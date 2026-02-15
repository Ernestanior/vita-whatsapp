/**
 * Supabase Server Client
 * 
 * This module provides a server-side Supabase client with service role access.
 * Use this for server-side operations that require elevated permissions.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Create a Supabase client with service role access
 * This bypasses Row Level Security (RLS) policies
 */
export async function createClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create a Supabase client with anon key (respects RLS)
 */
export async function createAnonClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
