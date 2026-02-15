-- Verification Script for RLS Policies Migration
-- Run this after applying 002_enable_rls.sql to verify RLS is properly configured

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

SELECT 
  'RLS Enabled' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'health_profiles',
  'food_records',
  'subscriptions',
  'usage_quotas',
  'user_feedback',
  'achievements'
)
ORDER BY tablename;

-- ============================================================================
-- VERIFY POLICIES COUNT
-- ============================================================================

SELECT 
  'RLS Policies' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ HAS POLICIES'
    ELSE '✗ NO POLICIES'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'health_profiles',
  'food_records',
  'subscriptions',
  'usage_quotas',
  'user_feedback',
  'achievements'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- LIST ALL POLICIES
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause present'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause present'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'health_profiles',
  'food_records',
  'subscriptions',
  'usage_quotas',
  'user_feedback',
  'achievements'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFY EXPECTED POLICIES
-- ============================================================================

WITH expected_policies AS (
  SELECT 'users' as table_name, 3 as expected_count
  UNION ALL SELECT 'health_profiles', 4
  UNION ALL SELECT 'food_records', 4
  UNION ALL SELECT 'subscriptions', 3
  UNION ALL SELECT 'usage_quotas', 3
  UNION ALL SELECT 'user_feedback', 4
  UNION ALL SELECT 'achievements', 3
),
actual_policies AS (
  SELECT 
    tablename as table_name,
    COUNT(*) as actual_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
)
SELECT 
  e.table_name,
  e.expected_count,
  COALESCE(a.actual_count, 0) as actual_count,
  CASE 
    WHEN COALESCE(a.actual_count, 0) = e.expected_count THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM expected_policies e
LEFT JOIN actual_policies a ON e.table_name = a.table_name
ORDER BY e.table_name;

-- ============================================================================
-- VERIFY POLICY OPERATIONS
-- ============================================================================

SELECT 
  'Policy Operations' as check_type,
  tablename,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'health_profiles',
  'food_records',
  'subscriptions',
  'usage_quotas',
  'user_feedback',
  'achievements'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '=== RLS VERIFICATION SUMMARY ===' as summary,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      AND tablename IN ('users', 'health_profiles', 'food_records', 'subscriptions', 'usage_quotas', 'user_feedback', 'achievements')
    ) = 7
    AND (
      SELECT COUNT(*) 
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'health_profiles', 'food_records', 'subscriptions', 'usage_quotas', 'user_feedback', 'achievements')
    ) >= 24
    THEN '✓ ALL CHECKS PASSED - RLS is properly configured!'
    ELSE '✗ SOME CHECKS FAILED - Please review the output above'
  END as result;

-- ============================================================================
-- DETAILED POLICY INFORMATION
-- ============================================================================

SELECT 
  '=== DETAILED POLICY INFORMATION ===' as info;

SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'health_profiles',
  'food_records',
  'subscriptions',
  'usage_quotas',
  'user_feedback',
  'achievements'
)
ORDER BY tablename, cmd, policyname;
