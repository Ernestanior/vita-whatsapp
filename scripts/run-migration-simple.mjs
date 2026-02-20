/**
 * Simple Migration Runner
 * 直接通过 Supabase SQL Editor 运行迁移
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running Phase 3 Migration...\n');

  try {
    // 读取迁移文件
    const migrationPath = join(__dirname, '..', 'migrations', '011_phase3_personalization_gamification.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL loaded');
    console.log(`📏 Length: ${migrationSQL.length} characters\n`);

    // 直接测试表是否存在
    console.log('🔍 Checking existing tables...\n');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['daily_budgets', 'reminders', 'visual_cards']);

    if (tablesError) {
      console.log('Note: Could not query information_schema, will proceed with migration');
    } else {
      console.log(`Found ${tables?.length || 0} existing Phase 3 tables`);
    }

    console.log('\n📝 Migration SQL Preview:');
    console.log('─'.repeat(80));
    console.log(migrationSQL.substring(0, 500) + '...\n');
    console.log('─'.repeat(80));

    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
    console.log('\n   Or copy the SQL from: migrations/011_phase3_personalization_gamification.sql');

    // 尝试验证一些基础操作
    console.log('\n🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError.message);
    } else {
      console.log('✅ Database connection successful');
    }

    // 尝试创建一个简单的表来测试权限
    console.log('\n🧪 Testing table creation permissions...');
    
    const testTableSQL = `
      CREATE TABLE IF NOT EXISTS _phase3_migration_test (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_column TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 注意：Supabase JS 客户端不直接支持执行任意 SQL
    // 我们需要使用 REST API 或者手动在 SQL Editor 中运行

    console.log('\n📋 Next Steps:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Copy the contents of migrations/011_phase3_personalization_gamification.sql');
    console.log('3. Paste and run in SQL Editor');
    console.log('4. Run this script again to verify');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
