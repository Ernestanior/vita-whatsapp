/**
 * Protein Distribution Analysis (P2-12)
 *
 * Classifies meals into time slots (breakfast/lunch/dinner/snack)
 * and calculates an evenness score (0-100).
 * 100 = perfectly even across the 3 main meals.
 */

export interface MealProteinEntry {
  protein: number;   // grams
  createdAt: Date;
}

export interface ProteinDistribution {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
  evenness: number;  // 0-100
}

/**
 * Classify a timestamp into a meal slot based on hour (SGT = UTC+8).
 */
function classifyMealSlot(date: Date): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  // Convert to SGT hour
  const hour = (date.getUTCHours() + 8) % 24;

  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

/**
 * Analyze protein distribution across meals.
 */
export function analyzeProteinDistribution(entries: MealProteinEntry[]): ProteinDistribution {
  const dist: ProteinDistribution = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, evenness: 0 };

  for (const e of entries) {
    const slot = classifyMealSlot(e.createdAt);
    dist[slot] += Math.round(e.protein);
  }

  // Evenness: compare the 3 main meals using coefficient of variation (inverted)
  const mainMeals = [dist.breakfast, dist.lunch, dist.dinner];
  const total = mainMeals.reduce((a, b) => a + b, 0);

  if (total === 0) {
    dist.evenness = 0;
    return dist;
  }

  const mean = total / 3;
  const variance = mainMeals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / 3;
  const cv = Math.sqrt(variance) / mean; // 0 = perfect, higher = worse

  // Map CV to 0-100 score: CV=0 → 100, CV≥1.0 → 0
  dist.evenness = Math.max(0, Math.round((1 - cv) * 100));

  return dist;
}

type Lang = 'en' | 'zh-CN' | 'zh-TW';

/**
 * Format protein distribution for WhatsApp digest message.
 */
export function formatDistribution(d: ProteinDistribution, lang: Lang): string {
  const total = d.breakfast + d.lunch + d.dinner + d.snack;
  if (total === 0) return '';

  const labels: Record<Lang, { title: string; b: string; l: string; d: string; s: string; score: string }> = {
    'en': { title: '🥩 Protein Distribution', b: 'Breakfast', l: 'Lunch', d: 'Dinner', s: 'Snack', score: 'Evenness' },
    'zh-CN': { title: '🥩 蛋白质分布', b: '早餐', l: '午餐', d: '晚餐', s: '零食', score: '均匀度' },
    'zh-TW': { title: '🥩 蛋白質分佈', b: '早餐', l: '午餐', d: '晚餐', s: '零食', score: '均勻度' },
  };

  const l = labels[lang];
  const g = lang === 'en' ? 'g' : '克';

  let msg = `${l.title}:\n`;
  msg += `• ${l.b}: ${d.breakfast}${g}\n`;
  msg += `• ${l.l}: ${d.lunch}${g}\n`;
  msg += `• ${l.d}: ${d.dinner}${g}\n`;
  if (d.snack > 0) {
    msg += `• ${l.s}: ${d.snack}${g}\n`;
  }
  msg += `• ${l.score}: ${d.evenness}/100`;

  return msg;
}
