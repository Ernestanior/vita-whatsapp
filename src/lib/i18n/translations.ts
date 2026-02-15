/**
 * Translation files for multi-language support
 * Requirements: 15.1, 15.3, 15.4
 */

export type Language = 'en' | 'zh-CN' | 'zh-TW';

export interface Translations {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
  };

  // Food recognition
  food: {
    recognizing: string;
    recognized: string;
    confidence: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    sodium: string;
    portion: string;
    total: string;
  };

  // Health rating
  rating: {
    green: string;
    yellow: string;
    red: string;
    score: string;
    healthy: string;
    moderate: string;
    unhealthy: string;
    suggestions: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    todayCalories: string;
    mealsToday: string;
    healthScore: string;
    quota: string;
    target: string;
    weeklyAvg: string;
    nutrition: string;
    recentMeals: string;
    exportCSV: string;
    exportPDF: string;
    logout: string;
    noMeals: string;
  };

  // Profile
  profile: {
    height: string;
    weight: string;
    age: string;
    gender: string;
    goal: string;
    activityLevel: string;
    male: string;
    female: string;
    loseWeight: string;
    gainMuscle: string;
    controlSugar: string;
    maintain: string;
    sedentary: string;
    light: string;
    moderate: string;
    active: string;
  };

  // Subscription
  subscription: {
    free: string;
    premium: string;
    pro: string;
    upgrade: string;
    quotaExceeded: string;
    unlimited: string;
  };

  // Meal context
  meal: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      retry: 'Retry',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
    },
    food: {
      recognizing: 'Recognizing food...',
      recognized: 'Recognized',
      confidence: 'Confidence',
      calories: 'Calories',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',
      sodium: 'Sodium',
      portion: 'Portion',
      total: 'Total',
    },
    rating: {
      green: 'Green',
      yellow: 'Yellow',
      red: 'Red',
      score: 'Score',
      healthy: 'Healthy',
      moderate: 'Moderate',
      unhealthy: 'Unhealthy',
      suggestions: 'Suggestions',
    },
    dashboard: {
      title: 'Vita AI Dashboard',
      todayCalories: "Today's Calories",
      mealsToday: 'Meals Today',
      healthScore: 'Health Score',
      quota: 'Daily Quota',
      target: 'Target',
      weeklyAvg: 'Weekly avg',
      nutrition: "Today's Nutrition",
      recentMeals: 'Recent Meals',
      exportCSV: 'Export CSV',
      exportPDF: 'Export PDF',
      logout: 'Logout',
      noMeals: 'No meals recorded yet. Start by sending a food photo to Vita AI on WhatsApp!',
    },
    profile: {
      height: 'Height',
      weight: 'Weight',
      age: 'Age',
      gender: 'Gender',
      goal: 'Health Goal',
      activityLevel: 'Activity Level',
      male: 'Male',
      female: 'Female',
      loseWeight: 'Lose Weight',
      gainMuscle: 'Gain Muscle',
      controlSugar: 'Control Sugar',
      maintain: 'Maintain',
      sedentary: 'Sedentary',
      light: 'Light',
      moderate: 'Moderate',
      active: 'Active',
    },
    subscription: {
      free: 'Free',
      premium: 'Premium',
      pro: 'Pro',
      upgrade: 'Upgrade',
      quotaExceeded: 'Daily quota exceeded',
      unlimited: 'Unlimited',
    },
    meal: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
    },
  },
  'zh-CN': {
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      retry: '重试',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      back: '返回',
    },
    food: {
      recognizing: '正在识别食物...',
      recognized: '已识别',
      confidence: '置信度',
      calories: '卡路里',
      protein: '蛋白质',
      carbs: '碳水化合物',
      fat: '脂肪',
      sodium: '钠',
      portion: '份量',
      total: '总计',
    },
    rating: {
      green: '绿灯',
      yellow: '黄灯',
      red: '红灯',
      score: '评分',
      healthy: '健康',
      moderate: '适中',
      unhealthy: '不健康',
      suggestions: '建议',
    },
    dashboard: {
      title: 'Vita AI 仪表板',
      todayCalories: '今日卡路里',
      mealsToday: '今日餐数',
      healthScore: '健康评分',
      quota: '每日配额',
      target: '目标',
      weeklyAvg: '周平均',
      nutrition: '今日营养',
      recentMeals: '最近餐食',
      exportCSV: '导出 CSV',
      exportPDF: '导出 PDF',
      logout: '退出',
      noMeals: '还没有记录餐食。在 WhatsApp 上向 Vita AI 发送食物照片开始吧！',
    },
    profile: {
      height: '身高',
      weight: '体重',
      age: '年龄',
      gender: '性别',
      goal: '健康目标',
      activityLevel: '活动水平',
      male: '男',
      female: '女',
      loseWeight: '减脂',
      gainMuscle: '增肌',
      controlSugar: '控糖',
      maintain: '维持',
      sedentary: '久坐',
      light: '轻度活动',
      moderate: '中度活动',
      active: '高度活动',
    },
    subscription: {
      free: '免费',
      premium: '高级',
      pro: '专业',
      upgrade: '升级',
      quotaExceeded: '已超过每日配额',
      unlimited: '无限',
    },
    meal: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐',
    },
  },
  'zh-TW': {
    common: {
      loading: '載入中...',
      error: '錯誤',
      success: '成功',
      retry: '重試',
      cancel: '取消',
      confirm: '確認',
      save: '儲存',
      delete: '刪除',
      edit: '編輯',
      back: '返回',
    },
    food: {
      recognizing: '正在識別食物...',
      recognized: '已識別',
      confidence: '置信度',
      calories: '卡路里',
      protein: '蛋白質',
      carbs: '碳水化合物',
      fat: '脂肪',
      sodium: '鈉',
      portion: '份量',
      total: '總計',
    },
    rating: {
      green: '綠燈',
      yellow: '黃燈',
      red: '紅燈',
      score: '評分',
      healthy: '健康',
      moderate: '適中',
      unhealthy: '不健康',
      suggestions: '建議',
    },
    dashboard: {
      title: 'Vita AI 儀表板',
      todayCalories: '今日卡路里',
      mealsToday: '今日餐數',
      healthScore: '健康評分',
      quota: '每日配額',
      target: '目標',
      weeklyAvg: '週平均',
      nutrition: '今日營養',
      recentMeals: '最近餐食',
      exportCSV: '匯出 CSV',
      exportPDF: '匯出 PDF',
      logout: '登出',
      noMeals: '還沒有記錄餐食。在 WhatsApp 上向 Vita AI 發送食物照片開始吧！',
    },
    profile: {
      height: '身高',
      weight: '體重',
      age: '年齡',
      gender: '性別',
      goal: '健康目標',
      activityLevel: '活動水平',
      male: '男',
      female: '女',
      loseWeight: '減脂',
      gainMuscle: '增肌',
      controlSugar: '控糖',
      maintain: '維持',
      sedentary: '久坐',
      light: '輕度活動',
      moderate: '中度活動',
      active: '高度活動',
    },
    subscription: {
      free: '免費',
      premium: '高級',
      pro: '專業',
      upgrade: '升級',
      quotaExceeded: '已超過每日配額',
      unlimited: '無限',
    },
    meal: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐',
    },
  },
};
