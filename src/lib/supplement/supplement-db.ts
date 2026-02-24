/**
 * Supplement Database
 * Local lookup for common supplements — no AI call needed.
 * Nutrition per standard serving.
 */

export interface SupplementEntry {
  id: string;
  names: string[];          // all aliases (EN + ZH + brand)
  category: 'protein' | 'bar' | 'creatine' | 'vitamin' | 'amino' | 'preworkout' | 'other';
  defaultServing: string;   // e.g. "1 scoop (30g)"
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sodium?: number;        // mg
  };
  brand?: string;
}

// ─── Database ────────────────────────────────────────────
export const SUPPLEMENT_DB: SupplementEntry[] = [
  // ── Whey Protein ──────────────────────────────────────
  {
    id: 'on-gold-standard',
    names: ['on gold standard', 'on金标', 'on 金标', 'optimum nutrition', 'gold standard whey', '金标蛋白粉'],
    category: 'protein',
    defaultServing: '1 scoop (31g)',
    brand: 'Optimum Nutrition',
    nutrition: { calories: 120, protein: 24, carbs: 3, fat: 1.5, sodium: 130 },
  },
  {
    id: 'myprotein-impact-whey',
    names: ['myprotein', 'impact whey', 'mp蛋白粉', 'myprotein蛋白粉'],
    category: 'protein',
    defaultServing: '1 scoop (25g)',
    brand: 'Myprotein',
    nutrition: { calories: 103, protein: 21, carbs: 1, fat: 1.9, sodium: 50 },
  },
  {
    id: 'muscletech-nitrotech',
    names: ['nitrotech', 'nitro tech', 'muscletech', '肌肉科技'],
    category: 'protein',
    defaultServing: '1 scoop (46g)',
    brand: 'MuscleTech',
    nutrition: { calories: 160, protein: 30, carbs: 4, fat: 2.5, sodium: 210 },
  },
  {
    id: 'generic-whey',
    names: ['蛋白粉', 'whey', 'whey protein', 'protein powder', '乳清蛋白', 'protein shake', '蛋白奶昔'],
    category: 'protein',
    defaultServing: '1 scoop (30g)',
    nutrition: { calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  },
  {
    id: 'casein',
    names: ['casein', '酪蛋白', 'casein protein', '酪蛋白粉'],
    category: 'protein',
    defaultServing: '1 scoop (33g)',
    nutrition: { calories: 120, protein: 24, carbs: 3, fat: 1 },
  },

  // ── Protein Bars ──────────────────────────────────────
  {
    id: 'quest-bar',
    names: ['quest bar', 'quest', 'quest蛋白棒'],
    category: 'bar',
    defaultServing: '1 bar (60g)',
    brand: 'Quest',
    nutrition: { calories: 190, protein: 21, carbs: 21, fat: 7 },
  },
  {
    id: 'generic-protein-bar',
    names: ['蛋白棒', 'protein bar', '能量棒', 'energy bar'],
    category: 'bar',
    defaultServing: '1 bar (60g)',
    nutrition: { calories: 200, protein: 20, carbs: 22, fat: 8 },
  },
  {
    id: 'rxbar',
    names: ['rxbar', 'rx bar'],
    category: 'bar',
    defaultServing: '1 bar (52g)',
    brand: 'RXBAR',
    nutrition: { calories: 210, protein: 12, carbs: 24, fat: 9 },
  },

  // ── Creatine ──────────────────────────────────────────
  {
    id: 'creatine',
    names: ['creatine', '肌酸', 'creatine monohydrate', '一水肌酸'],
    category: 'creatine',
    defaultServing: '1 scoop (5g)',
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },

  // ── Amino / BCAA ──────────────────────────────────────
  {
    id: 'bcaa',
    names: ['bcaa', 'bcaas', '支链氨基酸'],
    category: 'amino',
    defaultServing: '1 scoop (7g)',
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },

  // ── Pre-workout ───────────────────────────────────────
  {
    id: 'preworkout',
    names: ['pre-workout', 'preworkout', 'pre workout', '氮泵', 'c4'],
    category: 'preworkout',
    defaultServing: '1 scoop (6g)',
    nutrition: { calories: 5, protein: 0, carbs: 1, fat: 0 },
  },

  // ── Mass Gainer ───────────────────────────────────────
  {
    id: 'mass-gainer',
    names: ['mass gainer', '增肌粉', 'weight gainer', '增重粉'],
    category: 'protein',
    defaultServing: '1 scoop (50g)',
    nutrition: { calories: 200, protein: 15, carbs: 30, fat: 3 },
  },

  // ── Vitamins / Other ──────────────────────────────────
  {
    id: 'fish-oil',
    names: ['fish oil', '鱼油', 'omega 3', 'omega-3'],
    category: 'vitamin',
    defaultServing: '1 capsule',
    nutrition: { calories: 10, protein: 0, carbs: 0, fat: 1 },
  },
  {
    id: 'multivitamin',
    names: ['multivitamin', '维生素', '复合维生素', 'vitamin', 'multi vitamin'],
    category: 'vitamin',
    defaultServing: '1 tablet',
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },
  {
    id: 'collagen',
    names: ['collagen', '胶原蛋白', 'collagen peptides'],
    category: 'other',
    defaultServing: '1 scoop (10g)',
    nutrition: { calories: 35, protein: 9, carbs: 0, fat: 0 },
  },
];

// ─── Matcher ─────────────────────────────────────────────

/**
 * Find best matching supplement from user text.
 * Returns null if no match found.
 */
export function matchSupplement(text: string): { entry: SupplementEntry; quantity: number } | null {
  const lower = text.toLowerCase().replace(/[，。！？]/g, '');

  // Extract quantity (e.g. "2杯", "two scoops", "3勺")
  let quantity = 1;
  const qtyMatch = lower.match(/(\d+)\s*(?:杯|勺|scoop|scoops|serving|servings|份|条|bar|bars|capsule|capsules|粒|颗|片|tablet|tablets)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
    if (quantity > 10) quantity = 1; // sanity cap
  }
  // Also check "两杯" / "三勺" style
  const zhQtyMap: Record<string, number> = { '两': 2, '二': 2, '三': 3, '四': 4, '五': 5, '半': 0.5 };
  for (const [char, num] of Object.entries(zhQtyMap)) {
    if (lower.includes(char + '杯') || lower.includes(char + '勺') || lower.includes(char + '条') || lower.includes(char + '份')) {
      quantity = num;
      break;
    }
  }

  // Score each entry
  let bestMatch: SupplementEntry | null = null;
  let bestScore = 0;

  for (const entry of SUPPLEMENT_DB) {
    for (const name of entry.names) {
      if (lower.includes(name.toLowerCase())) {
        // Longer match = more specific = higher priority
        const score = name.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }
  }

  if (!bestMatch) return null;
  return { entry: bestMatch, quantity };
}
