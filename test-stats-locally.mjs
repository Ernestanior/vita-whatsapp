/**
 * Quick local test of stats command recognition
 */

// Simulate the recognizeCommand function
function recognizeCommand(text) {
  const normalizedText = text.trim().toLowerCase();

  const commandMap = {
    '/stats': 'STATS',
    'stats': 'STATS',
    '/统计': 'STATS',
    '/統計': 'STATS',
    '统计': 'STATS',
    '統計': 'STATS',
  };

  return commandMap[normalizedText] || 'UNKNOWN';
}

// Test cases
const testCases = [
  'stats',
  'Stats',
  'STATS',
  ' stats ',
  '/stats',
  'stat',
  'statistics',
];

console.log('Testing command recognition:\n');

for (const testCase of testCases) {
  const result = recognizeCommand(testCase);
  console.log(`Input: "${testCase}" -> Command: ${result}`);
}
