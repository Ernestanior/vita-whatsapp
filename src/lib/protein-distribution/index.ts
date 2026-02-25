/**
 * Protein Distribution Analysis (P2-12)
 * Classifies meals by time slot and scores protein evenness across main meals.
 * Ideal: ~equal protein at breakfast, lunch, dinner for optimal MPS.
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface ProteinDistribution {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
  evenness: number; // 0-100
}

interface MealRecord {
  protein: number;   // grams (avg of min/max)
  createdAt: Date;
}

// ── Time-slot classification ────────────────────────────
export function classifyMealSlot(hour: number): MealSlot {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

// ── Evenness score ──────────────────────────────────────
// Uses coefficient of variation (CV) of the 3 main meals.
// CV = 0 → perfectly even → score 100
// CV ≥ 1 → very uneven   → score 0
function evennessScore(b: number, l: number, d: number): number {
  const vals = [b, l, d];
  const total = vals.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  const mean = total / 3;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / 3;
  const cv = Math.sqrt(variance) / mean;

  // Map CV 0→100, CV≥1→0
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

// ── Main analysis ───────────────────────────────────────
export function analyzeProteinDistribution(records: MealRecord[]): ProteinDistribution {
  const slots: Record<MealSlot, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

  for (const r of records) {
    const hour = r.createdAt.getHours();
    const slot = classifyMealSlot(hour);
    slots[slot] += r.protein;
  }

  // Round
  const b = Math.round(slots.breakfast);
  const l = Math.round(slots.lunch);
  const d = Math.round(slots.dinner);
  const s = Math.round(slots.snack);

  return {
    breakfast: b,
    lunch: l,
    dinner: d,
    snack: s,
    evenness: evennessScore(b, l, d),
  };
}

// ── Format helpers ──────────────────────────────────────
export function formatDistribution(dist: ProteinDistribution, lang: 'en' | 'zh-CN' | 'zh-TW'): string {
  const total = dist.breakfast + dist.lunch + dist.dinner + dist.snack;
  if (total === 0) return '';

  const bar = (g: number) => {
    const pct = total > 0 ? g / total : 0;
    const filled = Math.round(pct * 8);
    return '▓'.repeat(filled) + '░'.repeat(8 - filled);
  };

  const isZh = lang !== 'en';
  const labels = isZh
    ? { b: '早餐', l: '午餐', d: '晚餐', s: '加餐' }
    : { b: 'Bkfst', l: 'Lunch', d: 'Dinner', s: 'Snack' };

  let text = isZh ? '🥩 蛋白质分布:\n' : '🥩 Protein Spread:\n';
  text += `${labels.b} ${bar(dist.breakfast)} ${dist.breakfast}g\n`;
  text += `${labels.l} ${bar(dist.lunch)} ${dist.lunch}g\n`;
  text += `${labels.d} ${bar(dist.dinner)} ${dist.dinner}g\n`;
  if (dist.snack > 0) {
    text += `${labels.s} ${bar(dist.snack)} ${dist.snack}g\n`;
  }

  // Evenness badge
  if (dist.evenness >= 80) {
    text += isZh ? '✅ 分布均匀，利于肌肉合成' : '✅ Well spread — great for MPS';
  } else if (dist.evenness >= 50) {
    text += isZh ? '⚠️ 分布尚可，建议三餐更均匀' : '⚠️ Okay spread — try to balance meals';
  } else {
    text += isZh ? '🔴 分布不均，建议每餐摄入≥20g蛋白质' : '🔴 Uneven — aim for ≥20g protein per meal';
  }

  return text;
}
