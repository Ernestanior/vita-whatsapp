/**
 * Local Meal Prep Brand Database (P2-13)
 *
 * Pre-loaded nutrition data for popular SG meal prep brands.
 * Avoids AI calls for known items — fast, accurate, offline.
 */

export interface MealPrepItem {
  id: string;
  brand: string;
  names: string[];           // aliases (EN + ZH + shorthand)
  category: 'chicken' | 'fish' | 'beef' | 'pork' | 'vegan' | 'mixed' | 'snack' | 'drink';
  defaultServing: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sodium?: number;         // mg
  };
}

// ─── Database ────────────────────────────────────────────

export const MEAL_PREP_DB: MealPrepItem[] = [
  // ── YoloFoods ──────────────────────────────────────────
  {
    id: 'yolo-teriyaki-chicken',
    brand: 'YoloFoods',
    names: ['yolo teriyaki chicken', 'yolo teriyaki', 'yolofoods teriyaki'],
    category: 'chicken',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 450, protein: 42, carbs: 40, fat: 12, sodium: 680 },
  },
  {
    id: 'yolo-cajun-chicken',
    brand: 'YoloFoods',
    names: ['yolo cajun chicken', 'yolo cajun', 'yolofoods cajun'],
    category: 'chicken',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 430, protein: 40, carbs: 38, fat: 11, sodium: 720 },
  },
  {
    id: 'yolo-salmon',
    brand: 'YoloFoods',
    names: ['yolo salmon', 'yolofoods salmon', 'yolo三文鱼'],
    category: 'fish',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 480, protein: 38, carbs: 42, fat: 16, sodium: 600 },
  },
  {
    id: 'yolo-beef-bowl',
    brand: 'YoloFoods',
    names: ['yolo beef', 'yolofoods beef', 'yolo牛肉'],
    category: 'beef',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 490, protein: 40, carbs: 42, fat: 14, sodium: 750 },
  },

  // ── Nutrify Meals ──────────────────────────────────────
  {
    id: 'nutrify-grilled-chicken',
    brand: 'Nutrify',
    names: ['nutrify chicken', 'nutrify grilled chicken', 'nutrify鸡胸'],
    category: 'chicken',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 380, protein: 45, carbs: 28, fat: 8, sodium: 550 },
  },
  {
    id: 'nutrify-salmon',
    brand: 'Nutrify',
    names: ['nutrify salmon', 'nutrify三文鱼'],
    category: 'fish',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 420, protein: 38, carbs: 30, fat: 14, sodium: 520 },
  },
  {
    id: 'nutrify-beef',
    brand: 'Nutrify',
    names: ['nutrify beef', 'nutrify牛肉'],
    category: 'beef',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 440, protein: 42, carbs: 30, fat: 13, sodium: 620 },
  },

  // ── The Lean Bento ─────────────────────────────────────
  {
    id: 'leanbento-chicken-rice',
    brand: 'The Lean Bento',
    names: ['lean bento chicken', 'lean bento', 'the lean bento', 'lean bento鸡饭'],
    category: 'chicken',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 420, protein: 44, carbs: 35, fat: 10, sodium: 580 },
  },
  {
    id: 'leanbento-salmon',
    brand: 'The Lean Bento',
    names: ['lean bento salmon', 'lean bento三文鱼'],
    category: 'fish',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 460, protein: 40, carbs: 38, fat: 14, sodium: 560 },
  },

  // ── Fitthree ───────────────────────────────────────────
  {
    id: 'fitthree-chicken',
    brand: 'Fitthree',
    names: ['fitthree chicken', 'fitthree', 'fit three', 'fitthree鸡胸'],
    category: 'chicken',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 390, protein: 40, carbs: 32, fat: 9, sodium: 600 },
  },
  {
    id: 'fitthree-beef',
    brand: 'Fitthree',
    names: ['fitthree beef', 'fitthree牛肉'],
    category: 'beef',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 430, protein: 38, carbs: 34, fat: 13, sodium: 650 },
  },

  // ── Nourish ────────────────────────────────────────────
  {
    id: 'nourish-chicken',
    brand: 'Nourish',
    names: ['nourish chicken', 'nourish鸡胸', 'nourish meal'],
    category: 'chicken',
    defaultServing: '1 box (350g)',
    nutrition: { calories: 400, protein: 42, carbs: 30, fat: 10, sodium: 550 },
  },

  // ── Generic Meal Prep ──────────────────────────────────
  {
    id: 'generic-meal-prep-chicken',
    brand: 'Generic',
    names: ['meal prep chicken', '健身餐鸡胸', '减脂餐鸡胸', '健身鸡胸饭', 'meal prep鸡胸'],
    category: 'chicken',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 400, protein: 40, carbs: 32, fat: 10 },
  },
  {
    id: 'generic-meal-prep-salmon',
    brand: 'Generic',
    names: ['meal prep salmon', '健身餐三文鱼', '减脂餐三文鱼', 'meal prep三文鱼'],
    category: 'fish',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 440, protein: 36, carbs: 34, fat: 14 },
  },
  {
    id: 'generic-meal-prep-beef',
    brand: 'Generic',
    names: ['meal prep beef', '健身餐牛肉', '减脂餐牛肉', 'meal prep牛肉'],
    category: 'beef',
    defaultServing: '1 box (300g)',
    nutrition: { calories: 450, protein: 38, carbs: 34, fat: 14 },
  },
];

// ─── Matcher ─────────────────────────────────────────────

/**
 * Find best matching meal prep item from user text.
 * Returns null if no match found.
 */
export function matchMealPrep(text: string): { item: MealPrepItem; quantity: number } | null {
  const lower = text.toLowerCase().replace(/[，。！？]/g, '');

  // Extract quantity
  let quantity = 1;
  const qtyMatch = lower.match(/(\d+)\s*(?:盒|box|boxes|份|pack|packs|个)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
    if (quantity > 5) quantity = 1; // sanity cap
  }
  const zhQtyMap: Record<string, number> = { '两': 2, '二': 2, '三': 3, '四': 4, '五': 5 };
  for (const [char, num] of Object.entries(zhQtyMap)) {
    if (lower.includes(char + '盒') || lower.includes(char + '份')) {
      quantity = num;
      break;
    }
  }

  // Score each entry — longer match = more specific
  let bestMatch: MealPrepItem | null = null;
  let bestScore = 0;

  for (const item of MEAL_PREP_DB) {
    for (const name of item.names) {
      if (lower.includes(name.toLowerCase())) {
        const score = name.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item;
        }
      }
    }
  }

  if (!bestMatch) return null;
  return { item: bestMatch, quantity };
}
