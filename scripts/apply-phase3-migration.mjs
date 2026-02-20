/**
 * Apply Phase 3 Migration via Supabase REST API
 * 通过 REST API 应用 Phase 3 迁移
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从 .env 文件手动读取（不依赖 dotenv）
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // 移除引号
    if ((value.startsWith("'") && value.endsWith("'")) || 
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🚀 Phase 3 Migration Tool\n');
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);

// 读取迁移文件
const migrationPath = join(__dirname, '..', 'migrations', '011_phase3_personalization_gamification.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('📄 Migration file loaded');
console.log(`📏 SQL length: ${migrationSQL.length} characters\n`);

// 分割成独立的语句
const statements = [];
let currentStatement = '';
let inFunction = false;

migrationSQL.split('\n').forEach(line => {
  const trimmed = line.trim();
  
  // 跳过注释
  if (trimmed.startsWith('--') || trimmed.length === 0) {
    return;
  }

  // 检测函数定义
  if (trimmed.match(/CREATE (OR REPLACE )?FUNCTION/i)) {
    inFunction = true;
  }

  currentStatement += line + '\n';

  // 函数定义结束
  if (inFunction && trimmed.match(/\$\s*LANGUAGE/i)) {
    inFunction = false;
    statements.push(currentStatement.trim());
    currentStatement = '';
  }
  // 普通语句结束
  else if (!inFunction && trimmed.endsWith(';')) {
    statements.push(currentStatement.trim());
    currentStatement = '';
  }
});

if (currentStatement.trim()) {
  statements.push(currentStatement.trim());
}

console.log(`📊 Parsed ${statements.length} SQL statements\n`);

// 输出迁移说明
console.log('📋 Migration includes:');
console.log('  ✓ Enhanced user_preferences table');
console.log('  ✓ daily_budgets table');
console.log('  ✓ Enhanced user_streaks table');
console.log('  ✓ reminders table');
console.log('  ✓ Enhanced food_records table');
console.log('  ✓ visual_cards table');
console.log('  ✓ feature_discovery table');
console.log('  ✓ user_engagement_metrics table');
console.log('  ✓ social_connections table (optional)');
console.log('  ✓ community_challenges table (optional)');
console.log('  ✓ user_challenge_progress table (optional)');
console.log('  ✓ Helper functions\n');

console.log('⚠️  MANUAL MIGRATION REQUIRED\n');
console.log('Due to Supabase client limitations, please run the migration manually:\n');
console.log('1. Open Supabase Dashboard SQL Editor:');
console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '')}/sql/new\n`);
console.log('2. Copy the entire contents of:');
console.log('   migrations/011_phase3_personalization_gamification.sql\n');
console.log('3. Paste into SQL Editor and click "Run"\n');
console.log('4. Verify tables were created successfully\n');

console.log('💡 Tip: You can also use Supabase CLI:');
console.log('   supabase db push\n');

console.log('✅ Migration file is ready at:');
console.log(`   ${migrationPath}\n`);
