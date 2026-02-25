import { describe, it, expect } from 'vitest';
import {
  WeeklyReportData,
  buildTrendChartUrl,
  buildTextReport,
  buildCardCaption,
} from '@/lib/weekly-report';

// ── Test Data Fixtures ─────────────────────────────────

const createFullWeekData = (): WeeklyReportData => ({
  totalMeals: 21,
  totalCal: 14000,
  totalProtein: 700,
  totalCarbs: 1400,
  greenCount: 15,
  yellowCount: 4,
  redCount: 2,
  dailyData: {
    Mon: { cal: 2000, protein: 100, carbs: 200 },
    Tue: { cal: 1800, protein: 90, carbs: 180 },
    Wed: { cal: 2200, protein: 110, carbs: 220 },
    Thu: { cal: 1900, protein: 95, carbs: 190 },
    Fri: { cal: 2100, protein: 105, carbs: 210 },
    Sat: { cal: 2000, protein: 100, carbs: 200 },
    Sun: { cal: 2000, protein: 100, carbs: 200 },
  },
  daysWithData: 7,
  streak: 5,
  proteinTarget: 140,
  carbTarget: 250,
});

const createPartialWeekData = (): WeeklyReportData => ({
  totalMeals: 9,
  totalCal: 5700,
  totalProtein: 285,
  totalCarbs: 570,
  greenCount: 6,
  yellowCount: 2,
  redCount: 1,
  dailyData: {
    Mon: { cal: 1900, protein: 95, carbs: 190 },
    Wed: { cal: 1800, protein: 90, carbs: 180 },
    Fri: { cal: 2000, protein: 100, carbs: 200 },
  },
  daysWithData: 3,
  streak: 0,
  proteinTarget: 140,
  carbTarget: 250,
});

const createAllZerosData = (): WeeklyReportData => ({
  totalMeals: 7,
  totalCal: 0,
  totalProtein: 0,
  totalCarbs: 0,
  greenCount: 0,
  yellowCount: 0,
  redCount: 7,
  dailyData: {
    Mon: { cal: 0, protein: 0, carbs: 0 },
    Tue: { cal: 0, protein: 0, carbs: 0 },
    Wed: { cal: 0, protein: 0, carbs: 0 },
    Thu: { cal: 0, protein: 0, carbs: 0 },
    Fri: { cal: 0, protein: 0, carbs: 0 },
    Sat: { cal: 0, protein: 0, carbs: 0 },
    Sun: { cal: 0, protein: 0, carbs: 0 },
  },
  daysWithData: 7,
  streak: 0,
  proteinTarget: 140,
  carbTarget: 250,
});

const createSingleDayData = (): WeeklyReportData => ({
  totalMeals: 3,
  totalCal: 1800,
  totalProtein: 90,
  totalCarbs: 180,
  greenCount: 2,
  yellowCount: 1,
  redCount: 0,
  dailyData: {
    Mon: { cal: 1800, protein: 90, carbs: 180 },
  },
  daysWithData: 1,
  streak: 1,
  proteinTarget: 140,
  carbTarget: 250,
});

const createEmptyData = (): WeeklyReportData => ({
  totalMeals: 0,
  totalCal: 0,
  totalProtein: 0,
  totalCarbs: 0,
  greenCount: 0,
  yellowCount: 0,
  redCount: 0,
  dailyData: {},
  daysWithData: 1, // Minimum to avoid division by zero
  streak: 0,
  proteinTarget: 140,
  carbTarget: 250,
});

// ── Chart Generation Tests ─────────────────────────────

describe('buildTrendChartUrl', () => {
  it('should generate chart URL with full week data in English', () => {
    const data = createFullWeekData();
    const url = buildTrendChartUrl(data, false);

    expect(url).toContain('quickchart.io/chart');
    expect(url).toContain('Protein(g)');
    expect(url).toContain('Carbs(g)');
    expect(url).toContain('Mon');
    expect(url).toContain('Tue');
    expect(url).toContain('Sun');
  });

  it('should generate chart URL with full week data in Chinese', () => {
    const data = createFullWeekData();
    const url = buildTrendChartUrl(data, true);
    const decoded = decodeURIComponent(url);

    expect(url).toContain('quickchart.io/chart');
    expect(decoded).toContain('蛋白质(g)');
    expect(decoded).toContain('碳水(g)');
    expect(decoded).toContain('周一');
    expect(decoded).toContain('周二');
    expect(decoded).toContain('周日');
  });

  it('should handle missing days with zeros', () => {
    const data = createPartialWeekData();
    const url = buildTrendChartUrl(data, false);

    expect(url).toContain('quickchart.io/chart');
    // URL should still contain all 7 days
    expect(url).toContain('Mon');
    expect(url).toContain('Sun');
  });

  it('should handle all zeros data', () => {
    const data = createAllZerosData();
    const url = buildTrendChartUrl(data, false);

    expect(url).toContain('quickchart.io/chart');
    expect(url).toBeTruthy();
    expect(url.length).toBeGreaterThan(0);
  });

  it('should include protein and carb target lines', () => {
    const data = createFullWeekData();
    const url = buildTrendChartUrl(data, false);
    const decoded = decodeURIComponent(url);

    expect(decoded).toContain('P target');
    expect(decoded).toContain('C target');
  });

  it('should handle single day data', () => {
    const data = createSingleDayData();
    const url = buildTrendChartUrl(data, false);

    expect(url).toContain('quickchart.io/chart');
    expect(url).toBeTruthy();
  });
});

// ── Text Summary Tests ─────────────────────────────────

describe('buildTextReport', () => {
  it('should generate English summary with full week data', () => {
    const data = createFullWeekData();
    const summary = buildTextReport(data, false);

    expect(summary).toContain('Weekly Macro Report');
    expect(summary).toContain('21 meals');
    expect(summary).toContain('kcal');
    expect(summary).toContain('P100g');
    expect(summary).toContain('C200g');
    expect(summary).toContain('🟢15');
    expect(summary).toContain('🟡4');
    expect(summary).toContain('🔴2');
    expect(summary).toContain('71% healthy');
    expect(summary).toContain('🔥5');
  });

  it('should generate Chinese summary with full week data', () => {
    const data = createFullWeekData();
    const summary = buildTextReport(data, true);

    expect(summary).toContain('本周宏量报告');
    expect(summary).toContain('21餐');
    expect(summary).toContain('kcal');
    expect(summary).toContain('P100g');
    expect(summary).toContain('C200g');
    expect(summary).toContain('🟢15');
    expect(summary).toContain('🟡4');
    expect(summary).toContain('🔴2');
    expect(summary).toContain('71%健康');
    expect(summary).toContain('🔥5');
  });

  it('should generate bar chart with proper scaling', () => {
    const data = createFullWeekData();
    const summary = buildTextReport(data, false);

    // Check that bars are present
    expect(summary).toContain('█');
    expect(summary).toContain('Mon');
    expect(summary).toContain('2000kcal');
  });

  it('should scale bars relative to highest value', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      dailyData: {
        Mon: { cal: 1000, protein: 50, carbs: 100 },
        Tue: { cal: 2000, protein: 100, carbs: 200 },
        Wed: { cal: 500, protein: 25, carbs: 50 },
      },
      daysWithData: 3,
    };
    const summary = buildTextReport(data, false);

    // Highest value (2000) should have full bar (8 blocks)
    // Check that summary contains bars
    expect(summary).toContain('█');
    expect(summary).toContain('2000kcal');
  });

  it('should handle missing days correctly', () => {
    const data = createPartialWeekData();
    const summary = buildTextReport(data, false);

    expect(summary).toContain('Mon');
    expect(summary).toContain('Wed');
    expect(summary).toContain('Fri');
    expect(summary).not.toContain('Tue');
    expect(summary).not.toContain('Thu');
  });

  it('should handle all zeros data', () => {
    const data = createAllZerosData();
    const summary = buildTextReport(data, false);

    expect(summary).toContain('Weekly Macro Report');
    expect(summary).toContain('0kcal');
    expect(summary).toContain('P0g');
    expect(summary).toContain('C0g');
  });

  it('should not show streak emoji when streak is 0', () => {
    const data = createPartialWeekData();
    const summary = buildTextReport(data, false);

    expect(summary).not.toContain('🔥');
  });

  it('should handle single day data', () => {
    const data = createSingleDayData();
    const summary = buildTextReport(data, false);

    expect(summary).toContain('3 meals');
    expect(summary).toContain('Mon');
    expect(summary).toContain('1800kcal');
    expect(summary).toContain('P90g');
    expect(summary).toContain('C180g');
    expect(summary).toContain('🔥1');
  });

  it('should handle empty data gracefully', () => {
    const data = createEmptyData();
    const summary = buildTextReport(data, false);

    expect(summary).toContain('Weekly Macro Report');
    expect(summary).toContain('0 meals');
  });

  it('should calculate health rate correctly', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      totalMeals: 10,
      greenCount: 8,
      yellowCount: 1,
      redCount: 1,
    };
    const summary = buildTextReport(data, false);

    expect(summary).toContain('80% healthy');
  });
});

// ── Card Caption Tests ─────────────────────────────────

describe('buildCardCaption', () => {
  it('should generate English caption with full week data', () => {
    const data = createFullWeekData();
    const caption = buildCardCaption(data, false);

    expect(caption).toContain('Weekly');
    expect(caption).toContain('P100g');
    expect(caption).toContain('C200g');
    expect(caption).toContain('71% healthy');
    expect(caption).toContain('🔥5');
    expect(caption).toContain('Screenshot & share with friends!');
  });

  it('should generate Chinese caption with full week data', () => {
    const data = createFullWeekData();
    const caption = buildCardCaption(data, true);

    expect(caption).toContain('本周');
    expect(caption).toContain('P100g');
    expect(caption).toContain('C200g');
    expect(caption).toContain('71%健康');
    expect(caption).toContain('🔥5');
    expect(caption).toContain('截图分享给朋友');
  });

  it('should not show streak when streak is 0', () => {
    const data = createPartialWeekData();
    const caption = buildCardCaption(data, false);

    expect(caption).not.toContain('🔥');
  });

  it('should calculate averages based on daysWithData', () => {
    const data = createPartialWeekData();
    const caption = buildCardCaption(data, false);

    // totalProtein=285, daysWithData=3 -> avg=95
    expect(caption).toContain('P95g');
    // totalCarbs=570, daysWithData=3 -> avg=190
    expect(caption).toContain('C190g');
  });

  it('should handle single day data', () => {
    const data = createSingleDayData();
    const caption = buildCardCaption(data, false);

    expect(caption).toContain('P90g');
    expect(caption).toContain('C180g');
    expect(caption).toContain('67% healthy');
    expect(caption).toContain('🔥1');
  });

  it('should handle all zeros data', () => {
    const data = createAllZerosData();
    const caption = buildCardCaption(data, false);

    expect(caption).toContain('P0g');
    expect(caption).toContain('C0g');
    expect(caption).toContain('0% healthy');
  });
});

// ── Edge Cases ─────────────────────────────────────────

describe('Edge Cases', () => {
  it('should handle very high calorie values', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      dailyData: {
        Mon: { cal: 5000, protein: 200, carbs: 500 },
        Tue: { cal: 4500, protein: 180, carbs: 450 },
      },
      daysWithData: 2,
    };

    const summary = buildTextReport(data, false);
    expect(summary).toContain('5000kcal');
    expect(summary).toContain('P200g');

    const url = buildTrendChartUrl(data, false);
    expect(url).toBeTruthy();
  });

  it('should handle very low calorie values', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      dailyData: {
        Mon: { cal: 100, protein: 5, carbs: 10 },
        Tue: { cal: 150, protein: 8, carbs: 15 },
      },
      daysWithData: 2,
    };

    const summary = buildTextReport(data, false);
    expect(summary).toContain('100kcal');
    expect(summary).toContain('P5g');
  });

  it('should handle division by zero with daysWithData=1 minimum', () => {
    const data = createEmptyData();

    const summary = buildTextReport(data, false);
    expect(summary).toBeTruthy();

    const caption = buildCardCaption(data, false);
    expect(caption).toBeTruthy();
  });

  it('should handle missing protein and carb targets', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      proteinTarget: 0,
      carbTarget: 0,
    };

    const url = buildTrendChartUrl(data, false);
    expect(url).toBeTruthy();
  });

  it('should handle 100% green meals', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      totalMeals: 10,
      greenCount: 10,
      yellowCount: 0,
      redCount: 0,
    };

    const summary = buildTextReport(data, false);
    expect(summary).toContain('100% healthy');
    expect(summary).toContain('🟢10');
    expect(summary).toContain('🟡0');
    expect(summary).toContain('🔴0');
  });

  it('should handle 100% red meals', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      totalMeals: 10,
      greenCount: 0,
      yellowCount: 0,
      redCount: 10,
    };

    const summary = buildTextReport(data, false);
    expect(summary).toContain('0% healthy');
    expect(summary).toContain('🟢0');
    expect(summary).toContain('🔴10');
  });

  it('should handle very long streak', () => {
    const data: WeeklyReportData = {
      ...createFullWeekData(),
      streak: 365,
    };

    const summary = buildTextReport(data, false);
    expect(summary).toContain('🔥365');

    const caption = buildCardCaption(data, false);
    expect(caption).toContain('🔥365');
  });
});
