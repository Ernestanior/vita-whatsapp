#!/usr/bin/env node

/**
 * 全面自然语言理解测试
 * 测试 360+ 种不同的用户表达方式
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const TEST_USER_PHONE = '6583153431';
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 测试用例集合
const testCases = {
  // 1. 查看连续打卡 (35 种问法)
  streak: [
    '我打卡多少天了',
    '连续几天了',
    '我坚持了多久',
    '记录了几天',
    '我连续记录多少天了',
    '我连续打卡几天啦',
    '看看我打卡情况',
    '我坚持得怎么样',
    '我有没有断过',
    '我连续多久没断了',
    '我打卡几天 lah',
    '看下我连续几天 leh',
    '我坚持了多久 ah',
    '我记录几天了 lor',
    '我连续打卡多少天 sia',
    '看看我的记录',
    '我做得怎么样',
    '我的进度如何',
    '我表现如何',
    '我有没有进步',
    '我有什么成就',
    '我解锁了什么',
    '我得到什么奖励了',
    '我有没有达成什么',
    '我完成了什么目标',
    '我比上周怎么样',
    '我最近表现如何',
    '我这个月坚持得好吗',
    '我有没有退步',
    '我进步了吗',
    '我会不会断了',
    '我今天还没记录吧',
    '我是不是要断了',
    '我还有多久要断',
    '我快断了吗'
  ],

  // 2. 预算管理 (35 种问法)
  budget: [
    '我今天吃了多少卡路里',
    '我还能吃多少',
    '我超了吗',
    '我今天的量够吗',
    '我还剩多少',
    '我今天吃太多了吗',
    '我还可以吃吗',
    '我超标了没',
    '我今天卡路里够不够',
    '我还能不能吃',
    '我今天吃太多了 lah',
    '我还可以吃 meh',
    '我超了 leh',
    '我今天够了 lor',
    '我还能吃 ah',
    '我想控制一下卡路里',
    '我要设个目标',
    '我每天不能超过多少',
    '我想限制一下摄入',
    '我要减少卡路里',
    '我想看看我吃了什么',
    '我今天的情况',
    '我的摄入量',
    '我今天怎么样',
    '我吃得多不多',
    '我是不是吃太多了',
    '我会不会超',
    '我这样会胖吗',
    '我今天吃得太多了吧',
    '我是不是该控制一下',
    '我想改一下目标',
    '我觉得太少了',
    '我想增加一点',
    '我想减少一点',
    '我要调整预算'
  ],

  // 3. 饮食偏好 (35 种问法)
  preferences: [
    '我不吃肉',
    '我吃素',
    '我是素食者',
    '我只吃菜',
    '我不吃动物',
    '我不吃肉的',
    '我吃素的 lah',
    '我不吃荤',
    '我只吃素菜',
    '我戒肉了',
    '我对花生过敏',
    '我不能吃花生',
    '我吃花生会过敏',
    '花生我不行',
    '我碰花生就过敏',
    '我不能吃花生的',
    '花生我不可以',
    '我吃花生会出事',
    '花生对我不好',
    '我碰花生就不行',
    '我在减肥',
    '我要控制糖分',
    '我不能吃太油的',
    '我要少油少盐',
    '我在控制饮食',
    '我有糖尿病',
    '我血糖高',
    '我要控制血糖',
    '我有高血压',
    '我胆固醇高',
    '我的偏好是什么',
    '你记住我什么了',
    '你知道我不能吃什么吗',
    '我有什么限制',
    '我的饮食习惯'
  ],

  // 4. 查看统计 (35 种问法)
  stats: [
    '我的数据',
    '我的统计',
    '我的记录',
    '我的情况',
    '我的表现',
    '我吃得怎么样',
    '我最近怎么样',
    '我表现如何',
    '我做得好不好',
    '我有没有进步',
    '我的数据 leh',
    '我表现怎样 ah',
    '我做得好吗 lah',
    '我有进步 meh',
    '看下我的情况 lor',
    '我吃得健康吗',
    '我营养够吗',
    '我蛋白质够不够',
    '我碳水太多了吗',
    '我脂肪摄入如何',
    '我比上周怎么样',
    '我这周比上周好吗',
    '我有没有改善',
    '我进步了没',
    '我退步了吗',
    '看看我的',
    '我想知道我的',
    '我的整体情况',
    '我最近的',
    '我这段时间的',
    '我平均每天吃多少',
    '我一般吃什么',
    '我最常吃什么',
    '我吃得最多的是什么',
    '我的饮食习惯'
  ],

  // 5. 查看历史 (35 种问法)
  history: [
    '我吃过什么',
    '我的历史',
    '我之前吃了什么',
    '我最近吃的',
    '我的记录',
    '我今天吃了什么',
    '我昨天吃了什么',
    '我这周吃了什么',
    '我最近几天吃的',
    '我上周吃了什么',
    '我吃过啥',
    '我之前吃啥了',
    '我最近吃啥',
    '我都吃了些什么',
    '我吃过哪些',
    '我吃过什么 leh',
    '我之前吃啥 ah',
    '我最近吃的 lor',
    '看下我吃过啥 lah',
    '我都吃了什么 sia',
    '我上次吃的是什么',
    '我早上吃了什么',
    '我中午吃的啥',
    '我晚上吃了什么',
    '我刚才吃的是什么',
    '看看我的',
    '我想看看',
    '我记录了什么',
    '我都记了啥',
    '我的餐食',
    '我经常吃什么',
    '我最爱吃什么',
    '我吃得最多的',
    '我重复吃了什么',
    '我常吃的是什么'
  ],

  // 6. 查看画像 (35 种问法)
  profile: [
    '我的资料',
    '我的信息',
    '我的画像',
    '我的档案',
    '我的个人信息',
    '我的基本信息',
    '我的数据',
    '关于我的',
    '我的情况',
    '我的详细信息',
    '我的资料 leh',
    '看下我的信息 ah',
    '我的画像 lor',
    '我的档案 lah',
    '我的 profile sia',
    '我现在 52kg',
    '我瘦了 2kg',
    '我胖了一点',
    '我体重变了',
    '我现在重了',
    '我瘦了 lah',
    '我胖了 leh',
    '我轻了一点',
    '我重了一些',
    '我体重有变化',
    '我身高 168',
    '我高 168cm',
    '我 168 高',
    '我的身高是 168',
    '我量了身高是 168',
    '我想减肥',
    '我要增肌',
    '我想控制血糖',
    '我要维持健康',
    '我的目标是减脂'
  ],

  // 7. 寻求帮助 (35 种问法)
  help: [
    '帮我',
    '帮帮我',
    '我需要帮助',
    '怎么办',
    '怎么用',
    '你能做什么',
    '你有什么功能',
    '你可以帮我什么',
    '你会什么',
    '你能帮我做什么',
    '你能干嘛',
    '你会啥',
    '你可以做啥',
    '你有啥用',
    '你能帮我啥',
    '你能做什么 leh',
    '你会啥 ah',
    '你可以帮我 meh',
    '你有什么功能 lor',
    '你能干嘛 lah',
    '我不知道怎么用',
    '我不会用',
    '我搞不懂',
    '我不明白',
    '我不清楚',
    '怎么看我的数据',
    '怎么设置预算',
    '怎么查看历史',
    '怎么更新信息',
    '怎么看连续',
    '有什么命令',
    '我可以说什么',
    '我该怎么问',
    '我能问什么',
    '有哪些指令'
  ],

  // 8. 饮食建议 (35 种问法)
  advice: [
    '早餐吃什么好',
    '早上吃啥',
    '早餐推荐',
    '早餐吃什么健康',
    '早上应该吃什么',
    '早餐吃啥好 lah',
    '早上吃什么 leh',
    '早餐推荐一下',
    '早上该吃啥',
    '早餐吃什么比较好',
    '午餐吃什么',
    '中午吃啥',
    '晚餐吃什么好',
    '晚上吃什么',
    '今晚吃啥',
    '我想减肥吃什么',
    '减肥应该吃什么',
    '吃什么能瘦',
    '怎么吃才能减肥',
    '减肥餐推荐',
    '我想增肌吃什么',
    '增肌应该吃什么',
    '吃什么能长肌肉',
    '怎么吃才能增肌',
    '增肌餐推荐',
    '吃什么健康',
    '健康饮食推荐',
    '我应该吃什么',
    '什么食物好',
    '推荐健康食物',
    '我该吃什么',
    '给我建议',
    '推荐一下',
    '我吃什么好',
    '有什么建议'
  ],

  // 9. 问候/闲聊 (35 种问法)
  greeting: [
    '你好',
    '嗨',
    'Hi',
    'Hello',
    '早上好',
    '你好 lah',
    '嗨 leh',
    '早 ah',
    '晚上好 lor',
    '哈喽 sia',
    '你是谁',
    '你叫什么',
    '你是什么',
    '你是机器人吗',
    '你是 AI 吗',
    '你能做什么',
    '你会什么',
    '你有什么用',
    '你可以帮我什么',
    '你的功能是什么',
    '今天天气好',
    '我好累',
    '我好饿',
    '我想吃东西',
    '我不想动',
    '我好开心',
    '我好难过',
    '我好沮丧',
    '我好兴奋',
    '我好紧张',
    '哈哈',
    '好的',
    '谢谢',
    '不客气',
    '再见'
  ]
};

// 预期意图映射
const expectedIntents = {
  streak: ['streak', 'stats', 'progress', 'achievement'],
  budget: ['budget', 'calories', 'limit'],
  preferences: ['preferences', 'dietary', 'allergy', 'health'],
  stats: ['stats', 'statistics', 'data', 'performance'],
  history: ['history', 'meals', 'records'],
  profile: ['profile', 'info', 'update', 'goal'],
  help: ['help', 'commands', 'guide'],
  advice: ['advice', 'recommendation', 'suggestion'],
  greeting: ['greeting', 'hello', 'chat']
};

// 测试结果
const results = {
  perfect: [],      // 5分：完美理解
  good: [],         // 4分：基本理解
  partial: [],      // 3分：部分理解
  misunderstood: [],// 2分：误解
  failed: []        // 1分：完全不理解
};

let totalTests = 0;
let totalScore = 0;

/**
 * 测试单个问法
 */
async function testPhrase(category, phrase, index) {
  totalTests++;
  
  try {
    console.log(`\n[${totalTests}] 测试: "${phrase}"`);
    console.log(`   类别: ${category}`);
    
    // 调用 AI 意图识别 API
    const response = await fetch(`${API_URL}/api/test-ai-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: phrase,
        userId: TEST_USER_PHONE
      })
    });
    
    if (!response.ok) {
      console.log(`   ❌ API 错误: ${response.status}`);
      results.failed.push({ category, phrase, reason: 'API Error' });
      totalScore += 1;
      return;
    }
    
    const data = await response.json();
    const detectedIntent = data.intent?.toLowerCase() || 'unknown';
    const confidence = data.confidence || 0;
    
    console.log(`   检测意图: ${detectedIntent} (置信度: ${confidence})`);
    
    // 评分
    const expectedList = expectedIntents[category];
    let score = 1;
    let rating = '❌ 完全不理解';
    
    if (detectedIntent === 'unknown') {
      score = 1;
      rating = '❌ 完全不理解';
      results.failed.push({ category, phrase, detected: detectedIntent });
    } else if (expectedList.includes(detectedIntent)) {
      if (confidence >= 0.8) {
        score = 5;
        rating = '✅ 完美理解';
        results.perfect.push({ category, phrase, detected: detectedIntent, confidence });
      } else if (confidence >= 0.6) {
        score = 4;
        rating = '✅ 基本理解';
        results.good.push({ category, phrase, detected: detectedIntent, confidence });
      } else {
        score = 3;
        rating = '⚠️ 部分理解';
        results.partial.push({ category, phrase, detected: detectedIntent, confidence });
      }
    } else {
      // 检查是否是相关意图
      const isRelated = expectedList.some(exp => 
        detectedIntent.includes(exp) || exp.includes(detectedIntent)
      );
      
      if (isRelated) {
        score = 3;
        rating = '⚠️ 部分理解';
        results.partial.push({ category, phrase, detected: detectedIntent });
      } else {
        score = 2;
        rating = '⚠️ 误解';
        results.misunderstood.push({ category, phrase, expected: category, detected: detectedIntent });
      }
    }
    
    totalScore += score;
    console.log(`   评分: ${score}/5 - ${rating}`);
    
    // 避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
    results.failed.push({ category, phrase, reason: error.message });
    totalScore += 1;
  }
}

/**
 * 测试一个类别
 */
async function testCategory(category, phrases, limit = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 测试类别: ${category.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  
  const testPhrases = limit ? phrases.slice(0, limit) : phrases;
  
  for (let i = 0; i < testPhrases.length; i++) {
    await testPhrase(category, testPhrases[i], i + 1);
  }
}

/**
 * 打印测试报告
 */
function printReport() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 测试报告`);
  console.log(`${'='.repeat(60)}\n`);
  
  const avgScore = (totalScore / totalTests).toFixed(2);
  const percentage = ((totalScore / (totalTests * 5)) * 100).toFixed(1);
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`总得分: ${totalScore}/${totalTests * 5}`);
  console.log(`平均分: ${avgScore}/5`);
  console.log(`理解率: ${percentage}%\n`);
  
  console.log(`✅ 完美理解 (5分): ${results.perfect.length} (${((results.perfect.length/totalTests)*100).toFixed(1)}%)`);
  console.log(`✅ 基本理解 (4分): ${results.good.length} (${((results.good.length/totalTests)*100).toFixed(1)}%)`);
  console.log(`⚠️ 部分理解 (3分): ${results.partial.length} (${((results.partial.length/totalTests)*100).toFixed(1)}%)`);
  console.log(`⚠️ 误解 (2分): ${results.misunderstood.length} (${((results.misunderstood.length/totalTests)*100).toFixed(1)}%)`);
  console.log(`❌ 完全不理解 (1分): ${results.failed.length} (${((results.failed.length/totalTests)*100).toFixed(1)}%)\n`);
  
  // 评级
  let grade = '';
  if (percentage >= 90) grade = '🏆 优秀';
  else if (percentage >= 80) grade = '🥈 良好';
  else if (percentage >= 70) grade = '🥉 及格';
  else grade = '❌ 不及格';
  
  console.log(`总体评级: ${grade}\n`);
  
  // 显示问题案例
  if (results.failed.length > 0) {
    console.log(`\n❌ 完全不理解的案例 (${results.failed.length}):`);
    results.failed.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. [${item.category}] "${item.phrase}"`);
      console.log(`   原因: ${item.reason || '无法识别意图'}\n`);
    });
  }
  
  if (results.misunderstood.length > 0) {
    console.log(`\n⚠️ 误解的案例 (${results.misunderstood.length}):`);
    results.misunderstood.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. [${item.category}] "${item.phrase}"`);
      console.log(`   预期: ${item.expected}, 检测到: ${item.detected}\n`);
    });
  }
  
  // 按类别统计
  console.log(`\n📊 按类别统计:\n`);
  Object.keys(testCases).forEach(category => {
    const categoryResults = [
      ...results.perfect.filter(r => r.category === category),
      ...results.good.filter(r => r.category === category),
      ...results.partial.filter(r => r.category === category),
      ...results.misunderstood.filter(r => r.category === category),
      ...results.failed.filter(r => r.category === category)
    ];
    
    const categoryScore = categoryResults.reduce((sum, r) => {
      if (results.perfect.includes(r)) return sum + 5;
      if (results.good.includes(r)) return sum + 4;
      if (results.partial.includes(r)) return sum + 3;
      if (results.misunderstood.includes(r)) return sum + 2;
      return sum + 1;
    }, 0);
    
    const categoryTotal = categoryResults.length;
    const categoryPercentage = categoryTotal > 0 
      ? ((categoryScore / (categoryTotal * 5)) * 100).toFixed(1)
      : 0;
    
    console.log(`${category}: ${categoryPercentage}% (${categoryScore}/${categoryTotal * 5})`);
  });
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 Vita AI 全面自然语言理解测试');
  console.log('==========================================\n');
  console.log(`测试用户: ${TEST_USER_PHONE}`);
  console.log(`API 地址: ${API_URL}`);
  console.log(`测试时间: ${new Date().toISOString()}\n`);
  
  // 选择测试模式
  const args = process.argv.slice(2);
  const mode = args[0] || 'sample'; // sample, full, category
  
  if (mode === 'full') {
    console.log('📋 模式: 全面测试 (所有 360+ 个问法)\n');
    for (const [category, phrases] of Object.entries(testCases)) {
      await testCategory(category, phrases);
    }
  } else if (mode === 'sample') {
    console.log('📋 模式: 抽样测试 (每类 10 个问法)\n');
    for (const [category, phrases] of Object.entries(testCases)) {
      await testCategory(category, phrases, 10);
    }
  } else {
    // 测试特定类别
    const category = mode;
    if (testCases[category]) {
      console.log(`📋 模式: 单类别测试 (${category})\n`);
      await testCategory(category, testCases[category]);
    } else {
      console.log(`❌ 未知类别: ${category}`);
      console.log(`可用类别: ${Object.keys(testCases).join(', ')}`);
      return;
    }
  }
  
  printReport();
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试执行错误:', error);
  process.exit(1);
});
