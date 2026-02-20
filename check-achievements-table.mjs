#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking achievements table structure...\n');

// Try to get table columns
const { data, error } = await supabase
  .from('achievements')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Error:', error.message);
  console.log('   Code:', error.code);
  console.log('   Details:', error.details);
} else {
  console.log('✅ Table exists');
  console.log('   Sample data:', data);
}

// Try to query with specific columns
console.log('\n🔍 Testing specific columns...\n');

const columns = [
  'id',
  'user_id',
  'achievement_type',
  'achievement_tier',
  'title',
  'description',
  'emoji',
  'earned_date',
  'created_at'
];

for (const col of columns) {
  const { error: colError } = await supabase
    .from('achievements')
    .select(col)
    .limit(1);
  
  if (colError) {
    console.log(`   ❌ Column '${col}' - ${colError.message}`);
  } else {
    console.log(`   ✅ Column '${col}' exists`);
  }
}
