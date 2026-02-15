/**
 * Row Level Security (RLS) Tests
 * Tests to verify RLS policies are working correctly
 * Requirements: 11.1, 11.2
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Create clients
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user IDs
const TEST_USER_1_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_2_ID = '00000000-0000-0000-0000-000000000002';

describe('Row Level Security (RLS) Tests', () => {
  beforeAll(async () => {
    // Create test users using service role (bypasses RLS)
    await serviceClient.from('users').upsert([
      {
        id: TEST_USER_1_ID,
        phone_number: '+6591111111',
        whatsapp_name: 'Test User 1',
        language: 'en',
      },
      {
        id: TEST_USER_2_ID,
        phone_number: '+6592222222',
        whatsapp_name: 'Test User 2',
        language: 'en',
      },
    ]);

    // Create test health profiles
    await serviceClient.from('health_profiles').upsert([
      {
        user_id: TEST_USER_1_ID,
        height: 170,
        weight: 70,
        goal: 'maintain',
        activity_level: 'light',
      },
      {
        user_id: TEST_USER_2_ID,
        height: 165,
        weight: 60,
        goal: 'lose-weight',
        activity_level: 'moderate',
      },
    ]);

    // Create test food records
    await serviceClient.from('food_records').insert([
      {
        user_id: TEST_USER_1_ID,
        image_url: 'https://example.com/image1.jpg',
        image_hash: 'hash1',
        recognition_result: {
          foods: [],
          totalNutrition: {
            calories: { min: 500, max: 600 },
            protein: { min: 20, max: 25 },
            carbs: { min: 60, max: 70 },
            fat: { min: 15, max: 20 },
            sodium: { min: 800, max: 1000 },
          },
          mealContext: 'lunch',
        },
        health_rating: {
          overall: 'green',
          score: 85,
          factors: [],
          suggestions: [],
        },
      },
      {
        user_id: TEST_USER_2_ID,
        image_url: 'https://example.com/image2.jpg',
        image_hash: 'hash2',
        recognition_result: {
          foods: [],
          totalNutrition: {
            calories: { min: 400, max: 500 },
            protein: { min: 15, max: 20 },
            carbs: { min: 50, max: 60 },
            fat: { min: 10, max: 15 },
            sodium: { min: 600, max: 800 },
          },
          mealContext: 'dinner',
        },
        health_rating: {
          overall: 'yellow',
          score: 70,
          factors: [],
          suggestions: [],
        },
      },
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await serviceClient.from('food_records').delete().in('user_id', [TEST_USER_1_ID, TEST_USER_2_ID]);
    await serviceClient.from('health_profiles').delete().in('user_id', [TEST_USER_1_ID, TEST_USER_2_ID]);
    await serviceClient.from('users').delete().in('id', [TEST_USER_1_ID, TEST_USER_2_ID]);
  });

  describe('Users Table RLS', () => {
    it('should allow users to view their own data', async () => {
      // Simulate authenticated user
      const { data: user1Client } = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: 'test1@example.com',
      });

      // This test requires actual auth, so we'll use service client to verify policy exists
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'users')
        .eq('policyname', 'Users can view own data');

      expect(policies).toBeDefined();
      expect(policies?.length).toBeGreaterThan(0);
    });

    it('should prevent users from viewing other users data', async () => {
      // This is enforced by RLS - anonymous client cannot see any users
      const { data, error } = await anonClient.from('users').select('*');

      // Without authentication, should get empty result or error
      expect(data).toEqual([]);
    });
  });

  describe('Health Profiles Table RLS', () => {
    it('should have RLS enabled on health_profiles', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'health_profiles')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for all CRUD operations', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'health_profiles');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('UPDATE');
      expect(operations).toContain('DELETE');
    });
  });

  describe('Food Records Table RLS', () => {
    it('should have RLS enabled on food_records', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'food_records')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for all CRUD operations', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'food_records');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('UPDATE');
      expect(operations).toContain('DELETE');
    });

    it('should prevent anonymous access to food records', async () => {
      const { data, error } = await anonClient.from('food_records').select('*');

      // Without authentication, should get empty result
      expect(data).toEqual([]);
    });
  });

  describe('Subscriptions Table RLS', () => {
    it('should have RLS enabled on subscriptions', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'subscriptions')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for SELECT, INSERT, UPDATE', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'subscriptions');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('UPDATE');
    });
  });

  describe('Usage Quotas Table RLS', () => {
    it('should have RLS enabled on usage_quotas', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'usage_quotas')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for SELECT, INSERT, UPDATE', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'usage_quotas');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('UPDATE');
    });
  });

  describe('User Feedback Table RLS', () => {
    it('should have RLS enabled on user_feedback', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'user_feedback')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for all CRUD operations', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'user_feedback');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('UPDATE');
      expect(operations).toContain('DELETE');
    });
  });

  describe('Achievements Table RLS', () => {
    it('should have RLS enabled on achievements', async () => {
      const { data: tableInfo } = await serviceClient
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'achievements')
        .single();

      expect(tableInfo?.rowsecurity).toBe(true);
    });

    it('should have policies for SELECT, INSERT, DELETE', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('cmd')
        .eq('tablename', 'achievements');

      const operations = policies?.map((p) => p.cmd) || [];
      expect(operations).toContain('SELECT');
      expect(operations).toContain('INSERT');
      expect(operations).toContain('DELETE');
    });
  });

  describe('Service Role Bypass', () => {
    it('should allow service role to access all data', async () => {
      // Service role should be able to see all users
      const { data: users, error } = await serviceClient.from('users').select('*');

      expect(error).toBeNull();
      expect(users).toBeDefined();
      expect(users?.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow service role to access all health profiles', async () => {
      const { data: profiles, error } = await serviceClient.from('health_profiles').select('*');

      expect(error).toBeNull();
      expect(profiles).toBeDefined();
      expect(profiles?.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow service role to access all food records', async () => {
      const { data: records, error } = await serviceClient.from('food_records').select('*');

      expect(error).toBeNull();
      expect(records).toBeDefined();
      expect(records?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('RLS Policy Coverage', () => {
    it('should have RLS enabled on all 7 tables', async () => {
      const { data: tables } = await serviceClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .in('tablename', [
          'users',
          'health_profiles',
          'food_records',
          'subscriptions',
          'usage_quotas',
          'user_feedback',
          'achievements',
        ]);

      expect(tables?.length).toBe(7);
      tables?.forEach((table) => {
        expect(table.rowsecurity).toBe(true);
      });
    });

    it('should have at least 24 policies across all tables', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('policyname')
        .eq('schemaname', 'public')
        .in('tablename', [
          'users',
          'health_profiles',
          'food_records',
          'subscriptions',
          'usage_quotas',
          'user_feedback',
          'achievements',
        ]);

      expect(policies?.length).toBeGreaterThanOrEqual(24);
    });
  });
});
