/**
 * Test natural language command recognition
 */

function recognizeCommand(text) {
  const normalizedText = text.trim().toLowerCase();

  // Exact command mappings
  const commandMap = {
    '/stats': 'STATS',
    'stats': 'STATS',
    '/统计': 'STATS',
    '统计': 'STATS',
    '/history': 'HISTORY',
    'history': 'HISTORY',
    '/历史': 'HISTORY',
    '历史': 'HISTORY',
    '/profile': 'PROFILE',
    'profile': 'PROFILE',
    '/help': 'HELP',
    'help': 'HELP',
  };

  // Check exact match first
  if (commandMap[normalizedText]) {
    return commandMap[normalizedText];
  }

  // Natural language intent recognition
  const statsKeywords = [
    '统计', '數據分析', '数据', '分析', '报告', '總結', '汇总'
  ];
  
  const historyKeywords = [
    '历史', '记录', '之前', '以前', '过去', '最近', '吃过', '吃了什么'
  ];
  
  const profileKeywords = [
    '画像', '个人', '资料', '信息', '我的', '档案', '身高', '体重'
  ];
  
  const helpKeywords = [
    '帮助', '怎么用', '如何', '教程', '说明', '不会', '不懂', '不明白'
  ];

  // Check for stats intent
  if (statsKeywords.some(keyword => normalizedText.includes(keyword))) {
    const historyScore = historyKeywords.filter(k => normalizedText.includes(k)).length;
    const statsScore = statsKeywords.filter(k => normalizedText.includes(k)).length;
    
    if (historyScore > statsScore) {
      return 'HISTORY';
    }
    
    return 'STATS';
  }
  
  // Check for history intent
  if (historyKeywords.some(keyword => normalizedText.includes(keyword))) {
    return 'HISTORY';
  }
  
  // Check for profile intent
  if (profileKeywords.some(keyword => normalizedText.includes(keyword))) {
    return 'PROFILE';
  }
  
  // Check for help intent
  if (helpKeywords.some(keyword => normalizedText.includes(keyword))) {
    return 'HELP';
  }

  return 'UNKNOWN';
}

// Test cases from user's screenshot
const testCases = [
  // User's actual messages
  '我想看一下数据分析',
  '我想看一下统计数据',
  '我最近饮食的统计数据呀',
  
  // More natural language variations
  '看看我的统计',
  '给我看看数据',
  '我的饮食分析',
  '最近吃了什么',
  '历史记录',
  '我的个人信息',
  '怎么用这个',
  
  // Exact commands (should still work)
  'stats',
  'history',
  'profile',
  'help',
  
  // Edge cases
  '我想看看最近的历史记录和统计数据',
  '帮我分析一下',
];

console.log('Testing Natural Language Command Recognition:\n');
console.log('=' .repeat(60));

for (const testCase of testCases) {
  const result = recognizeCommand(testCase);
  const emoji = result !== 'UNKNOWN' ? '✅' : '❌';
  console.log(`${emoji} "${testCase}"`);
  console.log(`   → ${result}\n`);
}

console.log('=' .repeat(60));
