const response = await fetch('https://vita-whatsapp.vercel.app/api/test-everything-e2e');
const data = await response.json();

console.log('📊 E2E Test Results\n');
console.log('Summary:', JSON.stringify(data.summary, null, 2));
console.log('\nFailed Tests:');

for (const [category, tests] of Object.entries(data.byCategory)) {
  console.log(`\n${category}:`);
  for (const test of tests) {
    if (!test.passed) {
      console.log(`  ❌ ${test.test}`);
      console.log(`     Expected: ${test.expected}`);
      console.log(`     Actual: ${test.actual || 'N/A'}`);
      console.log(`     Error: ${test.error || 'N/A'}`);
    }
  }
}
