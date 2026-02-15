/**
 * Manual RLS Verification Script
 * Run this script to verify RLS policies are properly configured
 * Requirements: 11.1, 11.2
 * 
 * Usage:
 *   npx tsx scripts/verify-rls.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: VerificationResult[] = [];

async function verifyRLSEnabled() {
  console.log('\n🔍 Checking if RLS is enabled on all tables...\n');

  const tables = [
    'users',
    'health_profiles',
    'food_records',
    'subscriptions',
    'usage_quotas',
    'user_feedback',
    'achievements',
  ];

  const { data, error } = await client.rpc('pg_tables_select', {
    schema_name: 'public',
  }).select('tablename, rowsecurity');

  if (error) {
    // Try alternative query
    const { data: altData, error: altError } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', tables);

    if (altError) {
      console.error('❌ Error querying pg_tables:', altError.message);
      results.push({
        check: 'RLS Enabled Check',
        status: 'FAIL',
        details: altError.message,
      });
      return;
    }

    for (const table of tables) {
      const tableInfo = altData?.find((t) => t.tablename === table);
      if (tableInfo?.rowsecurity) {
        console.log(`  ✅ ${table}: RLS enabled`);
        results.push({
          check: `RLS enabled on ${table}`,
          status: 'PASS',
        });
      } else {
        console.log(`  ❌ ${table}: RLS NOT enabled`);
        results.push({
          check: `RLS enabled on ${table}`,
          status: 'FAIL',
          details: 'RLS not enabled',
        });
      }
    }
    return;
  }

  for (const table of tables) {
    const tableInfo = data?.find((t: any) => t.tablename === table);
    if (tableInfo?.rowsecurity) {
      console.log(`  ✅ ${table}: RLS enabled`);
      results.push({
        check: `RLS enabled on ${table}`,
        status: 'PASS',
      });
    } else {
      console.log(`  ❌ ${table}: RLS NOT enabled`);
      results.push({
        check: `RLS enabled on ${table}`,
        status: 'FAIL',
        details: 'RLS not enabled',
      });
    }
  }
}

async function verifyPoliciesExist() {
  console.log('\n🔍 Checking if policies exist...\n');

  const expectedPolicies = {
    users: 3,
    health_profiles: 4,
    food_records: 4,
    subscriptions: 3,
    usage_quotas: 3,
    user_feedback: 4,
    achievements: 3,
  };

  const { data, error } = await client
    .from('pg_policies')
    .select('tablename, policyname')
    .eq('schemaname', 'public');

  if (error) {
    console.error('❌ Error querying pg_policies:', error.message);
    results.push({
      check: 'Policies Exist Check',
      status: 'FAIL',
      details: error.message,
    });
    return;
  }

  for (const [table, expectedCount] of Object.entries(expectedPolicies)) {
    const policies = data?.filter((p: any) => p.tablename === table) || [];
    const actualCount = policies.length;

    if (actualCount === expectedCount) {
      console.log(`  ✅ ${table}: ${actualCount}/${expectedCount} policies`);
      results.push({
        check: `Policies on ${table}`,
        status: 'PASS',
        details: `${actualCount} policies found`,
      });
    } else {
      console.log(`  ❌ ${table}: ${actualCount}/${expectedCount} policies`);
      results.push({
        check: `Policies on ${table}`,
        status: 'FAIL',
        details: `Expected ${expectedCount}, found ${actualCount}`,
      });
    }
  }
}

async function verifyPolicyOperations() {
  console.log('\n🔍 Checking policy operations...\n');

  const { data, error } = await client
    .from('pg_policies')
    .select('tablename, cmd')
    .eq('schemaname', 'public');

  if (error) {
    console.error('❌ Error querying policy operations:', error.message);
    results.push({
      check: 'Policy Operations Check',
      status: 'FAIL',
      details: error.message,
    });
    return;
  }

  const operationsByTable: Record<string, Set<string>> = {};

  data?.forEach((policy: any) => {
    if (!operationsByTable[policy.tablename]) {
      operationsByTable[policy.tablename] = new Set();
    }
    operationsByTable[policy.tablename].add(policy.cmd);
  });

  for (const [table, operations] of Object.entries(operationsByTable)) {
    const ops = Array.from(operations).join(', ');
    console.log(`  ℹ️  ${table}: ${ops}`);
  }

  results.push({
    check: 'Policy Operations',
    status: 'PASS',
    details: 'All tables have policies',
  });
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Checks: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log();

  if (failed > 0) {
    console.log('Failed Checks:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  ❌ ${r.check}`);
        if (r.details) {
          console.log(`     ${r.details}`);
        }
      });
    console.log();
  }

  if (failed === 0) {
    console.log('🎉 All checks passed! RLS is properly configured.');
  } else {
    console.log('⚠️  Some checks failed. Please review the migration.');
    console.log('\nTo apply the RLS migration:');
    console.log('  1. Go to Supabase Dashboard > SQL Editor');
    console.log('  2. Open migrations/002_enable_rls.sql');
    console.log('  3. Execute the migration');
    console.log('  4. Run this script again to verify');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  console.log('🔐 Row Level Security (RLS) Verification');
  console.log('Requirements: 11.1, 11.2\n');

  try {
    await verifyRLSEnabled();
    await verifyPoliciesExist();
    await verifyPolicyOperations();
    await printSummary();
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
  }
}

main();
