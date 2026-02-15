-- Verification Script for Initial Schema Migration
-- Run this after applying 001_initial_schema.sql to verify everything was created correctly

-- ============================================================================
-- VERIFY TABLES
-- ============================================================================

SELECT 
  'Tables' as check_type,
  COUNT(*) as expected_count,
  (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'users', 
      'health_profiles', 
      'food_records', 
      'subscriptions', 
      'usage_quotas',
      'user_feedback',
      'achievements'
    )
  ) as actual_count,
  CASE 
    WHEN COUNT(*) = (
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 
        'health_profiles', 
        'food_records', 
        'subscriptions', 
        'usage_quotas',
        'user_feedback',
        'achievements'
      )
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM (SELECT 1 FROM generate_series(1,7)) as expected;

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================

SELECT 
  'Indexes' as check_type,
  6 as expected_count,
  (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname IN (
      'idx_food_records_user_date',
      'idx_food_records_image_hash',
      'idx_subscriptions_user_status',
      'idx_usage_quotas_user_date',
      'idx_user_feedback_user',
      'idx_user_feedback_record'
    )
  ) as actual_count,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname IN (
        'idx_food_records_user_date',
        'idx_food_records_image_hash',
        'idx_subscriptions_user_status',
        'idx_usage_quotas_user_date',
        'idx_user_feedback_user',
        'idx_user_feedback_record'
      )
    ) = 6 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- ============================================================================
-- VERIFY FUNCTIONS
-- ============================================================================

SELECT 
  'Functions' as check_type,
  3 as expected_count,
  (
    SELECT COUNT(*) 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
      'increment_usage',
      'get_user_stats',
      'update_updated_at_column'
    )
  ) as actual_count,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      AND routine_name IN (
        'increment_usage',
        'get_user_stats',
        'update_updated_at_column'
      )
    ) = 3 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- ============================================================================
-- VERIFY TRIGGERS
-- ============================================================================

SELECT 
  'Triggers' as check_type,
  4 as expected_count,
  (
    SELECT COUNT(*) 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name IN (
      'update_users_updated_at',
      'update_health_profiles_updated_at',
      'update_subscriptions_updated_at',
      'update_usage_quotas_updated_at'
    )
  ) as actual_count,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name IN (
        'update_users_updated_at',
        'update_health_profiles_updated_at',
        'update_subscriptions_updated_at',
        'update_usage_quotas_updated_at'
      )
    ) = 4 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- ============================================================================
-- DETAILED TABLE INFORMATION
-- ============================================================================

SELECT 
  table_name,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  ) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
  'users', 
  'health_profiles', 
  'food_records', 
  'subscriptions', 
  'usage_quotas',
  'user_feedback',
  'achievements'
)
ORDER BY table_name;

-- ============================================================================
-- VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT 
  'Foreign Keys' as check_type,
  COUNT(*) as actual_count,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- VERIFY CHECK CONSTRAINTS
-- ============================================================================

SELECT 
  'Check Constraints' as check_type,
  COUNT(*) as actual_count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM information_schema.check_constraints
WHERE constraint_schema = 'public';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'health_profiles', 'food_records', 'subscriptions', 'usage_quotas', 'user_feedback', 'achievements')
    ) = 7
    AND (
      SELECT COUNT(*) FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('increment_usage', 'get_user_stats', 'update_updated_at_column')
    ) = 3
    THEN '✓ ALL CHECKS PASSED - Schema is ready!'
    ELSE '✗ SOME CHECKS FAILED - Please review the output above'
  END as result;
