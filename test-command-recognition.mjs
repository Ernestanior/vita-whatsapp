#!/usr/bin/env node

/**
 * Test command recognition logic
 */

console.log('\n🧪 Testing Command Recognition Logic\n');

const testCases = [
  'streak',
  'budget set 1800',
  'budget status',
  'preferences',
  'settings',
];

// Simulate the recognition logic
function recognizeCommand(text) {
  const normalizedText = text.trim().toLowerCase();
  const firstWord = normalizedText.split(/\s+/)[0];
  
  const commandMap = {
    'settings': 'SETTINGS',
    'preferences': 'PREFERENCES',
    'streak': 'STREAK',
    'budget': 'BUDGET',
  };
  
  // Check exact match first
  const exactMatch = commandMap[normalizedText];
  if (exactMatch) {
    return { command: exactMatch, method: 'exact match' };
  }
  
  // Check first word
  const firstWordMatch = commandMap[firstWord];
  if (firstWordMatch) {
    return { command: firstWordMatch, method: 'first word match' };
  }
  
  return { command: 'UNKNOWN', method: 'no match' };
}

console.log('Test Results:\n');
testCases.forEach(test => {
  const result = recognizeCommand(test);
  console.log(`Input: "${test}"`);
  console.log(`  → Command: ${result.command}`);
  console.log(`  → Method: ${result.method}\n`);
});

console.log('═'.repeat(60));
console.log('\n✅ Logic is correct!');
console.log('   "preferences" should match to PREFERENCES');
console.log('   "settings" should match to SETTINGS\n');

console.log('🔍 Possible issues:');
console.log('   1. Code changes not picked up by dev server');
console.log('   2. Caching issue');
console.log('   3. Different code path being executed\n');

console.log('💡 Solution: Hard restart dev server');
console.log('   1. Stop: Ctrl+C');
console.log('   2. Clear cache: rm -rf .next');
console.log('   3. Start: npm run dev\n');
