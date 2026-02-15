/**
 * 游戏化功能翻译
 * 打卡、成就、目标系统的多语言支持
 */

export const gamificationTranslations = {
  // 打卡系统
  streak: {
    newRecord: {
      en: '🔥 New record! {streak} day streak!',
      'zh-CN': '🔥 新纪录！连续打卡 {streak} 天！',
      'zh-TW': '🔥 新紀錄！連續打卡 {streak} 天！',
    },
    continue: {
      en: '🔥 {streak} day streak! Keep it up!',
      'zh-CN': '🔥 连续打卡 {streak} 天！继续保持！',
      'zh-TW': '🔥 連續打卡 {streak} 天！繼續保持！',
    },
    milestone7: {
      en: 'Week Warrior achievement unlocked!',
      'zh-CN': '解锁成就：一周战士！',
      'zh-TW': '解鎖成就：一週戰士！',
    },
    milestone30: {
      en: 'Month Master achievement unlocked!',
      'zh-CN': '解锁成就：月度大师！',
      'zh-TW': '解鎖成就：月度大師！',
    },
    milestone100: {
      en: 'Century Champion achievement unlocked!',
      'zh-CN': '解锁成就：百日冠军！',
      'zh-TW': '解鎖成就：百日冠軍！',
    },
    stats: {
      en: '📊 Your Streak Stats:\nCurrent: {current} days\nLongest: {longest} days\nTotal check-ins: {total}',
      'zh-CN': '📊 你的打卡统计：\n当前：{current} 天\n最长：{longest} 天\n总打卡：{total} 次',
      'zh-TW': '📊 你的打卡統計：\n當前：{current} 天\n最長：{longest} 天\n總打卡：{total} 次',
    },
  },

  // 成就系统
  achievement: {
    unlocked: {
      en: '🏆 Achievement Unlocked!\n\n{icon} {name}\n{description}\n\n+{points} points',
      'zh-CN': '🏆 解锁成就！\n\n{icon} {name}\n{description}\n\n+{points} 积分',
      'zh-TW': '🏆 解鎖成就！\n\n{icon} {name}\n{description}\n\n+{points} 積分',
    },
    list: {
      en: '🏆 Your Achievements ({count}):\n\n{achievements}',
      'zh-CN': '🏆 你的成就 ({count})：\n\n{achievements}',
      'zh-TW': '🏆 你的成就 ({count})：\n\n{achievements}',
    },
    empty: {
      en: 'No achievements yet. Keep using Vita AI to unlock achievements!',
      'zh-CN': '还没有成就。继续使用 Vita AI 来解锁成就吧！',
      'zh-TW': '還沒有成就。繼續使用 Vita AI 來解鎖成就吧！',
    },
  },

  // 每周目标
  goal: {
    created: {
      en: '🎯 Weekly Goal Set!\n\nGoal: {goal}\nTarget: {target}\n\nLet\'s do this! 💪',
      'zh-CN': '🎯 每周目标已设置！\n\n目标：{goal}\n目标值：{target}\n\n加油！💪',
      'zh-TW': '🎯 每週目標已設置！\n\n目標：{goal}\n目標值：{target}\n\n加油！💪',
    },
    progress: {
      en: '📈 Goal Progress:\n\n{goal}\nProgress: {current}/{target} ({progress}%)\n\n{encouragement}',
      'zh-CN': '📈 目标进度：\n\n{goal}\n进度：{current}/{target} ({progress}%)\n\n{encouragement}',
      'zh-TW': '📈 目標進度：\n\n{goal}\n進度：{current}/{target} ({progress}%)\n\n{encouragement}',
    },
    completed: {
      en: '🎉 Goal Completed!\n\n{goal}\n\nAmazing work! You\'ve completed your weekly goal! 🏆',
      'zh-CN': '🎉 目标完成！\n\n{goal}\n\n太棒了！你完成了本周目标！🏆',
      'zh-TW': '🎉 目標完成！\n\n{goal}\n\n太棒了！你完成了本週目標！🏆',
    },
    list: {
      en: '🎯 Your Weekly Goals:\n\n{goals}\n\nKeep pushing! 💪',
      'zh-CN': '🎯 你的每周目标：\n\n{goals}\n\n继续加油！💪',
      'zh-TW': '🎯 你的每週目標：\n\n{goals}\n\n繼續加油！💪',
    },
    empty: {
      en: 'No weekly goals set. Use /goal to set your goals!',
      'zh-CN': '还没有设置每周目标。使用 /goal 来设置目标吧！',
      'zh-TW': '還沒有設置每週目標。使用 /goal 來設置目標吧！',
    },
    types: {
      meals: {
        en: 'Log {target} meals',
        'zh-CN': '记录 {target} 餐',
        'zh-TW': '記錄 {target} 餐',
      },
      greenMeals: {
        en: 'Eat {target} healthy meals (green rating)',
        'zh-CN': '吃 {target} 餐健康食物（绿灯）',
        'zh-TW': '吃 {target} 餐健康食物（綠燈）',
      },
      exercise: {
        en: 'Exercise {target} times',
        'zh-CN': '运动 {target} 次',
        'zh-TW': '運動 {target} 次',
      },
    },
    encouragement: {
      low: {
        en: 'Just getting started! Keep going! 🌱',
        'zh-CN': '刚刚开始！继续加油！🌱',
        'zh-TW': '剛剛開始！繼續加油！🌱',
      },
      medium: {
        en: 'Great progress! You\'re halfway there! 🚀',
        'zh-CN': '进展不错！已经完成一半了！🚀',
        'zh-TW': '進展不錯！已經完成一半了！🚀',
      },
      high: {
        en: 'Almost there! You can do it! 🔥',
        'zh-CN': '快完成了！你可以的！🔥',
        'zh-TW': '快完成了！你可以的！🔥',
      },
    },
  },

  // 排行榜
  leaderboard: {
    title: {
      en: '🏆 Leaderboard (Top {count})',
      'zh-CN': '🏆 排行榜（前 {count} 名）',
      'zh-TW': '🏆 排行榜（前 {count} 名）',
    },
    entry: {
      en: '{rank}. {name} - {score} points',
      'zh-CN': '{rank}. {name} - {score} 分',
      'zh-TW': '{rank}. {name} - {score} 分',
    },
    yourRank: {
      en: 'Your rank: #{rank}',
      'zh-CN': '你的排名：第 {rank} 名',
      'zh-TW': '你的排名：第 {rank} 名',
    },
    optIn: {
      en: 'Want to join the leaderboard? Use /leaderboard join',
      'zh-CN': '想加入排行榜？使用 /leaderboard join',
      'zh-TW': '想加入排行榜？使用 /leaderboard join',
    },
  },

  // 命令帮助
  commands: {
    streak: {
      en: '/streak - View your check-in streak',
      'zh-CN': '/streak - 查看你的打卡记录',
      'zh-TW': '/streak - 查看你的打卡記錄',
    },
    achievements: {
      en: '/achievements - View your unlocked achievements',
      'zh-CN': '/achievements - 查看你的成就',
      'zh-TW': '/achievements - 查看你的成就',
    },
    goals: {
      en: '/goals - View and manage your weekly goals',
      'zh-CN': '/goals - 查看和管理每周目标',
      'zh-TW': '/goals - 查看和管理每週目標',
    },
    leaderboard: {
      en: '/leaderboard - View the leaderboard',
      'zh-CN': '/leaderboard - 查看排行榜',
      'zh-TW': '/leaderboard - 查看排行榜',
    },
  },
};

/**
 * 获取游戏化翻译
 */
export function getGamificationTranslation(
  key: string,
  language: string = 'en',
  params?: Record<string, string>
): string {
  const keys = key.split('.');
  let value: any = gamificationTranslations;

  for (const k of keys) {
    value = value?.[k];
    if (!value) return key;
  }

  let text = value[language] || value['en'] || key;

  // 替换参数
  if (params) {
    Object.entries(params).forEach(([param, val]) => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), val);
    });
  }

  return text;
}
