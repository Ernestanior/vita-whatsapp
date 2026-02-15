/**
 * Singapore food name mappings
 * Requirements: 15.5
 */

export interface FoodNameMapping {
  en: string;
  'zh-CN': string;
  'zh-TW': string;
}

/**
 * Common Singapore food names in multiple languages
 */
export const singaporeFoodNames: Record<string, FoodNameMapping> = {
  // Rice dishes
  'chicken-rice': {
    en: 'Chicken Rice',
    'zh-CN': '海南鸡饭',
    'zh-TW': '海南雞飯',
  },
  'nasi-lemak': {
    en: 'Nasi Lemak',
    'zh-CN': '椰浆饭',
    'zh-TW': '椰漿飯',
  },
  'fried-rice': {
    en: 'Fried Rice',
    'zh-CN': '炒饭',
    'zh-TW': '炒飯',
  },
  'cai-png': {
    en: 'Mixed Rice (Cai Png)',
    'zh-CN': '杂菜饭',
    'zh-TW': '雜菜飯',
  },

  // Noodles
  'laksa': {
    en: 'Laksa',
    'zh-CN': '叻沙',
    'zh-TW': '叻沙',
  },
  'char-kway-teow': {
    en: 'Char Kway Teow',
    'zh-CN': '炒粿条',
    'zh-TW': '炒粿條',
  },
  'bak-chor-mee': {
    en: 'Minced Meat Noodles',
    'zh-CN': '肉脞面',
    'zh-TW': '肉脞麵',
  },
  'hokkien-mee': {
    en: 'Hokkien Mee',
    'zh-CN': '福建面',
    'zh-TW': '福建麵',
  },
  'prawn-mee': {
    en: 'Prawn Noodles',
    'zh-CN': '虾面',
    'zh-TW': '蝦麵',
  },

  // Bread and breakfast
  'roti-prata': {
    en: 'Roti Prata',
    'zh-CN': '印度煎饼',
    'zh-TW': '印度煎餅',
  },
  'kaya-toast': {
    en: 'Kaya Toast',
    'zh-CN': '咖椰吐司',
    'zh-TW': '咖椰吐司',
  },

  // Soups
  'bak-kut-teh': {
    en: 'Bak Kut Teh',
    'zh-CN': '肉骨茶',
    'zh-TW': '肉骨茶',
  },

  // Satay and BBQ
  'satay': {
    en: 'Satay',
    'zh-CN': '沙爹',
    'zh-TW': '沙爹',
  },

  // Vegetables
  'kangkong': {
    en: 'Water Spinach',
    'zh-CN': '空心菜',
    'zh-TW': '空心菜',
  },
  'kailan': {
    en: 'Chinese Kale',
    'zh-CN': '芥兰',
    'zh-TW': '芥蘭',
  },

  // Drinks
  'teh': {
    en: 'Teh (Milk Tea)',
    'zh-CN': '奶茶',
    'zh-TW': '奶茶',
  },
  'kopi': {
    en: 'Kopi (Coffee)',
    'zh-CN': '咖啡',
    'zh-TW': '咖啡',
  },
  'teh-c': {
    en: 'Teh C (Tea with Evaporated Milk)',
    'zh-CN': '淡奶茶',
    'zh-TW': '淡奶茶',
  },
  'kopi-o': {
    en: 'Kopi O (Black Coffee)',
    'zh-CN': '黑咖啡',
    'zh-TW': '黑咖啡',
  },

  // Desserts
  'ice-kacang': {
    en: 'Ice Kacang',
    'zh-CN': '煎蕊',
    'zh-TW': '煎蕊',
  },
  'chendol': {
    en: 'Chendol',
    'zh-CN': '珍多',
    'zh-TW': '珍多',
  },
};

/**
 * Get localized food name
 */
export function getLocalizedFoodName(
  foodKey: string,
  language: 'en' | 'zh-CN' | 'zh-TW'
): string {
  const mapping = singaporeFoodNames[foodKey.toLowerCase()];
  if (mapping) {
    return mapping[language];
  }
  // Return original if no mapping found
  return foodKey;
}

/**
 * Find food key from any language name
 */
export function findFoodKey(foodName: string): string | null {
  const lowerName = foodName.toLowerCase();
  for (const [key, mapping] of Object.entries(singaporeFoodNames)) {
    if (
      mapping.en.toLowerCase() === lowerName ||
      mapping['zh-CN'].toLowerCase() === lowerName ||
      mapping['zh-TW'].toLowerCase() === lowerName
    ) {
      return key;
    }
  }
  return null;
}
