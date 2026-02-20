/**
 * Phase 3 Database Migration
 * 在应用启动时自动运行的迁移
 */

import { createClient } from '../supabase/server';
import { logger } from '@/utils/logger';

export async function runPhase3Migration(): Promise<boolean> {
  try {
    logger.info('Starting Phase 3 migration...');
    
    const supabase = await createClient();

    // 检查表是否已存在
    const { data: existingTables, error: checkError } = await supabase
      .from('daily_budgets')
      .select('id')
      .limit(1);

    if (!checkError) {
      logger.info('Phase 3 tables already exist, skipping migration');
      return true;
    }

    logger.info('Phase 3 tables not found, migration needed');
    logger.warn('Please run the migration SQL manually in Supabase Dashboard');
    logger.warn('File: migrations/011_phase3_personalization_gamification.sql');
    
    return false;
  } catch (error) {
    logger.error('Phase 3 migration check failed:', error);
    return false;
  }
}

/**
 * 验证 Phase 3 表是否存在
 */
export async function verifyPhase3Tables(): Promise<{
  success: boolean;
  tables: Record<string, boolean>;
}> {
  const supabase = await createClient();
  
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

  const results: Record<string, boolean> = {};

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      results[table] = !error;
    } catch {
      results[table] = false;
    }
  }

  const allExist = Object.values(results).every(v => v);

  return {
    success: allExist,
    tables: results
  };
}
