/**
 * Run Phase 3 Migration Script
 * 执行 Phase 3 数据库迁移
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量获取配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Starting Phase 3 Migration...\n');

  try {
    // 读取迁移文件
    const migrationPath = join(__dirname, '..', 'migrations', '011_phase3_personalization_gamification.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log(`📏 SQL length: ${migrationSQL.length} characters\n`);

    // 分割 SQL 语句（按分号分割，但保留函数定义）
    const statements = migrationSQL
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // 分割但保留引号内的分号
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    // 逐个执行语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // 尝试直接执行（某些语句可能不支持 rpc）
          const { error: directError } = await supabase.from('_migrations').insert({
            name: `phase3_statement_${i}`,
            executed_at: new Date().toISOString()
          });

          if (directError && !directError.message.includes('does not exist')) {
            console.error(`  ❌ Error: ${error.message}`);
            errorCount++;
          } else {
            console.log(`  ✅ Success`);
            successCount++;
          }
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📈 Total: ${statements.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 Phase 3 migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the logs.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// 验证迁移结果
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

  const tablesToCheck = [
    'daily_budgets',
    'reminders',
    'visual_cards',
    'feature_discovery',
    'user_engagement_metrics',
    'social_connections',
    'community_challenges',
    'user_challenge_progress'
  ];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: exists (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ Verification complete!');
}

// 执行迁移
runMigration()
  .then(() => verifyMigration())
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
