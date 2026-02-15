/**
 * Test script for ProfileManager
 * Demonstrates the profile setup flow
 * 
 * Run with: npx tsx scripts/test-profile-manager.ts
 */

import { ProfileManager } from '../src/lib/profile/profile-manager';

// Mock WhatsApp client for testing
const mockMessages: string[] = [];

const mockWhatsAppClient = {
  sendTextMessage: async (userId: string, text: string) => {
    console.log(`\n📱 Bot → User (${userId}):`);
    console.log(text);
    console.log('---');
    mockMessages.push(text);
  },
  sendButtonMessage: async (userId: string, text: string, buttons: any[]) => {
    console.log(`\n📱 Bot → User (${userId}) [Buttons]:`);
    console.log(text);
    console.log('Buttons:', buttons.map(b => b.title).join(', '));
    console.log('---');
  },
};

// Mock Supabase client
const mockProfiles = new Map<string, any>();

const mockSupabase = {
  from: (table: string) => ({
    insert: async (data: any) => {
      console.log(`\n💾 Database INSERT into ${table}:`, data);
      mockProfiles.set(data.user_id, data);
      return { error: null };
    },
    update: async (data: any) => ({
      eq: async (field: string, value: any) => {
        console.log(`\n💾 Database UPDATE ${table} where ${field}=${value}:`, data);
        const existing = mockProfiles.get(value);
        if (existing) {
          mockProfiles.set(value, { ...existing, ...data });
        }
        return { error: null };
      },
    }),
    select: (_fields: string) => ({
      eq: (_field: string, value: any) => ({
        single: async () => {
          const profile = mockProfiles.get(value);
          return { data: profile || null, error: profile ? null : { message: 'Not found' } };
        },
      }),
    }),
  }),
};

// Mock dependencies
vi.mock('@/lib/whatsapp/client', () => ({
  whatsappClient: mockWhatsAppClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => mockSupabase,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: (data: any) => console.log('ℹ️  INFO:', data),
    error: (data: any) => console.error('❌ ERROR:', data),
    warn: (data: any) => console.warn('⚠️  WARN:', data),
    debug: (data: any) => console.log('🐛 DEBUG:', data),
  },
}));

// Import vitest mock
import { vi } from 'vitest';

async function simulateProfileSetup() {
  console.log('🚀 Starting Profile Setup Simulation\n');
  console.log('=' .repeat(60));

  const profileManager = new ProfileManager();
  const userId = 'test-user-123';
  const language = 'en';

  // Step 1: Initialize profile
  console.log('\n📋 Step 1: Initialize Profile Setup');
  await profileManager.initializeProfile(userId, language);

  // Step 2: Provide height
  console.log('\n📋 Step 2: User provides height');
  console.log('👤 User → Bot: 170');
  await profileManager.processSetupInput(userId, '170', language);

  // Step 3: Provide weight
  console.log('\n📋 Step 3: User provides weight');
  console.log('👤 User → Bot: 70');
  await profileManager.processSetupInput(userId, '70', language);

  // Step 4: Provide age
  console.log('\n📋 Step 4: User provides age');
  console.log('👤 User → Bot: 30');
  await profileManager.processSetupInput(userId, '30', language);

  // Step 5: Provide gender
  console.log('\n📋 Step 5: User provides gender');
  console.log('👤 User → Bot: male');
  await profileManager.processSetupInput(userId, 'male', language);

  // Step 6: Select goal
  console.log('\n📋 Step 6: User selects goal');
  console.log('👤 User → Bot: 1 (Lose Weight)');
  await profileManager.processSetupInput(userId, '1', language);

  // Step 7: Select activity level
  console.log('\n📋 Step 7: User selects activity level');
  console.log('👤 User → Bot: 3 (Moderate)');
  const isComplete = await profileManager.processSetupInput(userId, '3', language);

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Profile Setup Complete: ${isComplete}`);

  // Test profile retrieval
  console.log('\n📋 Testing Profile Retrieval');
  const profile = await profileManager.getProfile(userId);
  console.log('Retrieved Profile:', profile);

  // Test natural language update
  console.log('\n📋 Testing Natural Language Update');
  console.log('👤 User → Bot: I\'m now 68kg');
  await profileManager.parseNaturalLanguageUpdate(userId, "I'm now 68kg", language);

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Simulation Complete!\n');
}

// Run simulation
simulateProfileSetup().catch(console.error);
