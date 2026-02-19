/**
 * Phase 3: Type Definitions
 * 所有 Phase 3 功能的类型定义
 */

// ============================================
// User Context & Feature Discovery
// ============================================

export interface UserContext {
  userId: string;
  totalMealsLogged: number;
  currentStreak: number;
  daysActive: number;
  lastActionType: 'meal_log' | 'command' | 'milestone';
  recentMealPattern?: string;
}

export interface FeatureIntroduction {
  featureName: string;
  message: string;
  priority: number;
}

export interface FeatureDiscoveryEngine {
  checkForIntroduction(context: UserContext): Promise<FeatureIntroduction | null>;
  recordIntroduction(userId: string, featureName: string): Promise<void>;
  recordEngagement(userId: string, featureName: string): Promise<void>;
  hasDiscovered(userId: string, featureName: string): Promise<boolean>;
}

// ============================================
// Preferences
// ============================================

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  detectedFrom: 'user_mention' | 'explicit_setting';
}

export interface UserPreferences {
  dietaryType: string[];
  allergies: Allergy[];
  favorites: string[];
  eatingHabits: {
    typicalMealTimes?: {
      breakfast?: string;
      lunch?: string;
      dinner?: string;
    };
    portionPreference?: 'small' | 'medium' | 'large';
  };
  minimalMode: boolean;
}

export interface ExtractedPreferences {
  dietaryType?: string[];
  allergies?: Allergy[];
  other?: Record<string, any>;
}

export interface AllergenWarning {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  message: string;
}

export interface PreferenceManager {
  extractFromMessage(userId: string, message: string): Promise<ExtractedPreferences>;
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreference(userId: string, key: string, value: any): Promise<void>;
  checkAllergens(userId: string, foodItems: string[]): Promise<AllergenWarning[]>;
}

// ============================================
// Budget Tracking
// ============================================

export interface BudgetStatus {
  enabled: boolean;
  target: number;
  consumed: number;
  remaining: number;
  percentageUsed: number;
  status: 'on_track' | 'approaching_limit' | 'over_budget';
  message?: string;
}

export interface BudgetHistoryEntry {
  date: Date;
  target: number;
  consumed: number;
  status: string;
}

export interface BudgetTracker {
  setBudget(userId: string, calorieTarget: number): Promise<void>;
  getBudgetStatus(userId: string): Promise<BudgetStatus>;
  updateAfterMeal(userId: string, calories: number): Promise<BudgetStatus>;
  disableBudget(userId: string): Promise<void>;
  getBudgetHistory(userId: string, days: number): Promise<BudgetHistoryEntry[]>;
}

// ============================================
// Streak & Achievements
// ============================================

export interface Achievement {
  id: string;
  type: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedDate: Date;
  title: string;
  description: string;
  emoji: string;
}

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
  milestoneReached?: number;
  achievementEarned?: Achievement;
  message: string;
}

export interface StreakRisk {
  currentStreak: number;
  hoursUntilLoss: number;
  hasFreeze: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalMealsLogged: number;
  achievements: Achievement[];
  streakFreezesAvailable: number;
  daysActive: number;
}

export interface StreakManager {
  updateStreak(userId: string): Promise<StreakUpdate>;
  checkStreakRisk(userId: string): Promise<StreakRisk | null>;
  useStreakFreeze(userId: string): Promise<boolean>;
  getStreakStats(userId: string): Promise<StreakStats>;
  awardAchievement(userId: string, achievementType: string): Promise<Achievement>;
}

// ============================================
// Visual Cards
// ============================================

export interface CardMetadata {
  cardId: string;
  userId: string;
  cardType: 'daily' | 'weekly' | 'achievement';
  generatedAt: Date;
  dataSnapshot: any;
}

export interface CardResult {
  imageBuffer: Buffer;
  imageUrl: string;
  caption: string;
  metadata: CardMetadata;
}

export interface CardGenerator {
  generateDailyCard(userId: string, date: Date): Promise<CardResult>;
  generateWeeklyCard(userId: string, weekStart: Date): Promise<CardResult>;
  generateAchievementCard(userId: string, achievement: Achievement): Promise<CardResult>;
  getCardHistory(userId: string): Promise<CardMetadata[]>;
}

// ============================================
// Reminders
// ============================================

export interface ReminderTimes {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ReminderBatch {
  totalProcessed: number;
  remindersSent: number;
  remindersSkipped: number;
  errors: number;
}

export interface ReminderService {
  enableReminders(userId: string, times?: ReminderTimes): Promise<void>;
  disableReminders(userId: string): Promise<void>;
  updateReminderTimes(userId: string, times: ReminderTimes): Promise<void>;
  processReminders(): Promise<ReminderBatch>;
  recordReminderResponse(userId: string, reminderId: string, responded: boolean): Promise<void>;
}

// ============================================
// Comparison & Analysis
// ============================================

export interface MealLog {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  createdAt: Date;
  mealCategory?: string;
}

export interface SimilarMeal {
  mealLog: MealLog;
  similarityScore: number;
  calorieDifference: number;
  daysSince: number;
}

export interface WeekStats {
  totalCalories: number;
  totalProtein: number;
  mealsLogged: number;
  avgCaloriesPerMeal: number;
}

export interface WeeklyComparison {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  changes: {
    calories: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    protein: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    mealsLogged: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  };
  insights: string[];
}

export interface EatingPattern {
  pattern: string;
  frequency: number;
  description: string;
  suggestion?: string;
}

export interface FoodFrequency {
  foodName: string;
  count: number;
  lastEaten: Date;
}

export interface ComparisonEngine {
  findSimilarMeals(userId: string, currentMeal: MealLog): Promise<SimilarMeal[]>;
  getWeeklyComparison(userId: string): Promise<WeeklyComparison>;
  getEatingPatterns(userId: string): Promise<EatingPattern[]>;
  getMealRecall(userId: string, date: Date): Promise<MealLog[]>;
  getTopFoods(userId: string, limit: number): Promise<FoodFrequency[]>;
}

// ============================================
// Database Types
// ============================================

export interface DailyBudget {
  id: string;
  userId: string;
  date: Date;
  calorieTarget: number;
  caloriesConsumed: number;
  budgetEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  userId: string;
  reminderType: 'breakfast' | 'lunch' | 'dinner';
  scheduledTime: string;
  enabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  effectivenessScore: number;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisualCard {
  id: string;
  userId: string;
  cardType: 'daily' | 'weekly' | 'achievement';
  generationDate: Date;
  imageUrl: string;
  dataSnapshot: any;
  shareCount: number;
  createdAt: Date;
}

export interface FeatureDiscovery {
  id: string;
  userId: string;
  featureName: string;
  introductionDate: Date;
  introductionCount: number;
  userEngaged: boolean;
  lastMentionedDate: Date;
  createdAt: Date;
}

export interface UserEngagementMetrics {
  userId: string;
  totalMealsLogged: number;
  daysActive: number;
  featuresEnabled: string[];
  lastActiveDate: Date;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}
