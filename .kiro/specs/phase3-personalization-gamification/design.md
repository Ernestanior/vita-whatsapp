# Design Document: Phase 3 Personalization & Gamification

## Overview

Phase 3 transforms the WhatsApp Health Bot from a simple calorie tracker into an engaging, personalized health companion. The design follows a "progressive enhancement" philosophy where core functionality remains simple (send photo → get calories), while advanced features unlock naturally through usage.

### Design Principles

1. **Zero Configuration**: All features work with smart defaults, no setup required
2. **Passive Intelligence**: System learns from user behavior without explicit input
3. **Contextual Discovery**: Features introduced at optimal moments based on usage patterns
4. **Opt-In Complexity**: Advanced features are optional and easily disabled
5. **Conversational Interface**: Natural language over commands and menus
6. **Cultural Relevance**: Singapore-specific content, bilingual support, local context

### Key Technical Decisions

- **Database**: Supabase (PostgreSQL) with Row Level Security for multi-tenant data isolation
- **Image Generation**: Canvas API (Node.js) for visual card creation
- **Scheduling**: Supabase Edge Functions with cron for reminders and daily resets
- **Caching**: Redis for frequently accessed user preferences and streak data
- **AI/NLP**: Existing Gemini integration for natural language understanding
- **State Management**: Database-driven with minimal in-memory state

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     WhatsApp Business API                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Webhook Handler (Next.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Message Router                                       │   │
│  │  - Image messages → Food Recognition                 │   │
│  │  - Text messages → Intent Detection                  │   │
│  │  - Commands → Feature Handlers                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Feature    │ │   Feature    │ │   Feature    │
│   Discovery  │ │   Handlers   │ │   Background │
│   Engine     │ │              │ │   Jobs       │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Preference  │ │   Budget     │ │   Streak     │        │
│  │   Manager    │ │   Tracker    │ │   Manager    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │    Card      │ │   Reminder   │ │  Comparison  │        │
│  │  Generator   │ │   Service    │ │   Engine     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                     │
│  - user_preferences    - streaks                             │
│  - daily_budgets       - achievements                        │
│  - meal_history        - reminders                           │
│  - visual_cards        - feature_discovery                   │
│  - social_connections  - user_engagement_metrics             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Meal Logging Flow (Core + Phase 3 Enhancements)**:
1. User sends food photo to WhatsApp
2. Webhook receives image, routes to food recognition
3. Food recognition returns calorie data
4. **Phase 3 Enhancements**:
   - Streak Manager checks and updates streak
   - Budget Tracker updates remaining budget (if enabled)
   - Comparison Engine checks for similar meals
   - Feature Discovery Engine determines if any feature should be introduced
5. Response formatter combines all data into single message
6. WhatsApp API sends response to user

**Feature Discovery Flow**:
1. User action triggers discovery check (meal logged, milestone reached, etc.)
2. Feature Discovery Engine queries `feature_discovery` table
3. Checks: Has feature been introduced? Was it ignored? Is timing appropriate?
4. If conditions met, adds feature introduction to response
5. Logs introduction attempt in database

**Reminder Flow**:
1. Cron job triggers at scheduled times (every 15 minutes)
2. Reminder Service queries users with active reminders
3. For each user, checks if meal logged for time slot
4. If not logged, sends reminder via WhatsApp API
5. Tracks reminder effectiveness in database

## Components and Interfaces

### 1. Feature Discovery Engine

**Purpose**: Intelligently introduce features at optimal moments without overwhelming users

**Interface**:
```typescript
interface FeatureDiscoveryEngine {
  // Check if any feature should be introduced based on current context
  checkForIntroduction(context: UserContext): Promise<FeatureIntroduction | null>;
  
  // Mark a feature as introduced
  recordIntroduction(userId: string, featureName: string): Promise<void>;
  
  // Mark a feature as engaged (user used it)
  recordEngagement(userId: string, featureName: string): Promise<void>;
  
  // Check if user has discovered a feature
  hasDiscovered(userId: string, featureName: string): Promise<boolean>;
}

interface UserContext {
  userId: string;
  totalMealsLogged: number;
  currentStreak: number;
  daysActive: number;
  lastActionType: 'meal_log' | 'command' | 'milestone';
  recentMealPattern?: string; // e.g., 'late_night', 'consistent', 'same_meal'
}

interface FeatureIntroduction {
  featureName: string;
  message: string; // The introduction message to append
  priority: number; // Higher priority features shown first
}
```

**Discovery Rules**:
- Maximum 1 feature introduction per day per user
- Minimum 2 days between introductions
- Features introduced in priority order: streaks → reminders → budget → cards → compare → social
- Context-sensitive introductions override scheduled ones (e.g., allergy mention triggers preference intro)

### 2. Preference Manager

**Purpose**: Passively learn and store user preferences without explicit configuration

**Interface**:
```typescript
interface PreferenceManager {
  // Extract and store preferences from natural language
  extractFromMessage(userId: string, message: string): Promise<ExtractedPreferences>;
  
  // Get user preferences
  getPreferences(userId: string): Promise<UserPreferences>;
  
  // Update specific preference
  updatePreference(userId: string, key: string, value: any): Promise<void>;
  
  // Check if food contains user allergens
  checkAllergens(userId: string, foodItems: string[]): Promise<AllergenWarning[]>;
}

interface UserPreferences {
  dietaryType: string[]; // ['vegetarian', 'halal', etc.]
  allergies: Allergy[];
  favorites: string[]; // Auto-detected from frequency
  eatingHabits: {
    typicalMealTimes?: { breakfast?: string; lunch?: string; dinner?: string };
    portionPreference?: 'small' | 'medium' | 'large';
  };
  minimalMode: boolean; // User requested simplified responses
}

interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  detectedFrom: 'user_mention' | 'explicit_setting';
}
```

**Learning Strategy**:
- NLP extraction from casual mentions (e.g., "I'm vegetarian" in any message)
- Frequency analysis for favorites (5+ logs of same food)
- Pattern detection for meal times (consistent logging times)
- Explicit commands for corrections ("preferences" command)

### 3. Budget Tracker

**Purpose**: Optional calorie budget tracking with supportive feedback

**Interface**:
```typescript
interface BudgetTracker {
  // Set or update daily budget
  setBudget(userId: string, calorieTarget: number): Promise<void>;
  
  // Get current budget status
  getBudgetStatus(userId: string): Promise<BudgetStatus>;
  
  // Update budget after meal log
  updateAfterMeal(userId: string, calories: number): Promise<BudgetStatus>;
  
  // Disable budget tracking
  disableBudget(userId: string): Promise<void>;
  
  // Get budget history
  getBudgetHistory(userId: string, days: number): Promise<BudgetHistoryEntry[]>;
}

interface BudgetStatus {
  enabled: boolean;
  target: number;
  consumed: number;
  remaining: number;
  percentageUsed: number;
  status: 'on_track' | 'approaching_limit' | 'over_budget';
  message?: string; // Supportive feedback message
}
```

**Budget Logic**:
- Resets daily at midnight SGT
- Warning at 80% (approaching limit)
- Supportive message at 100%+ (never negative/punishing)
- 30-day history for trend analysis
- Completely hidden when disabled (no mentions in responses)

### 4. Streak Manager

**Purpose**: Track consecutive days of logging with streak protection and achievements

**Interface**:
```typescript
interface StreakManager {
  // Update streak after meal log
  updateStreak(userId: string): Promise<StreakUpdate>;
  
  // Check if user is about to lose streak
  checkStreakRisk(userId: string): Promise<StreakRisk | null>;
  
  // Use streak freeze
  useStreakFreeze(userId: string): Promise<boolean>;
  
  // Get streak stats
  getStreakStats(userId: string): Promise<StreakStats>;
  
  // Award achievement
  awardAchievement(userId: string, achievementType: string): Promise<Achievement>;
}

interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
  milestoneReached?: number; // e.g., 7, 14, 30
  achievementEarned?: Achievement;
  message: string; // Celebration or encouragement message
}

interface StreakRisk {
  currentStreak: number;
  hoursUntilLoss: number;
  hasFreeze: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
}

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalMealsLogged: number;
  achievements: Achievement[];
  streakFreezesAvailable: number;
  daysActive: number;
}

interface Achievement {
  id: string;
  type: string; // 'first_meal', 'week_warrior', etc.
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedDate: Date;
  title: string;
  description: string;
  emoji: string;
}
```

**Streak Rules**:
- Increments on first meal of the day (any time before midnight)
- 1 streak freeze per week (resets Monday)
- Streak freeze must be used before streak breaks (not retroactive)
- Milestones: 3, 7, 14, 21, 30, 60, 90, 180, 365 days
- "Comeback streak" after break: only needs 3 days for achievement

### 5. Card Generator

**Purpose**: Create beautiful, shareable visual summary cards on demand

**Interface**:
```typescript
interface CardGenerator {
  // Generate daily summary card
  generateDailyCard(userId: string, date: Date): Promise<CardResult>;
  
  // Generate weekly summary card
  generateWeeklyCard(userId: string, weekStart: Date): Promise<CardResult>;
  
  // Generate achievement card
  generateAchievementCard(userId: string, achievement: Achievement): Promise<CardResult>;
  
  // Get card generation history
  getCardHistory(userId: string): Promise<CardMetadata[]>;
}

interface CardResult {
  imageBuffer: Buffer;
  imageUrl: string; // Uploaded to storage
  caption: string; // WhatsApp message caption
  metadata: CardMetadata;
}

interface CardMetadata {
  cardId: string;
  userId: string;
  cardType: 'daily' | 'weekly' | 'achievement';
  generatedAt: Date;
  dataSnapshot: any; // The data used to generate card
}
```

**Card Design Specifications**:
- Dimensions: 1080x1350px (4:5 ratio, Instagram-optimized)
- Format: PNG with transparency support
- File size: <2MB for WhatsApp compatibility
- Theme: Clean, modern, Singapore-inspired (hawker center motifs, local colors)
- Typography: Sans-serif, bilingual (English + Chinese)
- Color palette: Warm, inviting (not clinical)

**Card Content**:
- **Daily Card**: Total calories, meal count, streak status, top meal, motivational quote
- **Weekly Card**: 7-day calorie trend, meals logged, achievements earned, week-over-week comparison
- **Achievement Card**: Achievement badge, title, description, user stats, celebration message

### 6. Reminder Service

**Purpose**: Send timely, contextual reminders without being annoying

**Interface**:
```typescript
interface ReminderService {
  // Enable reminders for user
  enableReminders(userId: string, times?: ReminderTimes): Promise<void>;
  
  // Disable reminders
  disableReminders(userId: string): Promise<void>;
  
  // Update reminder times
  updateReminderTimes(userId: string, times: ReminderTimes): Promise<void>;
  
  // Process reminders (called by cron)
  processReminders(): Promise<ReminderBatch>;
  
  // Record reminder effectiveness
  recordReminderResponse(userId: string, reminderId: string, responded: boolean): Promise<void>;
}

interface ReminderTimes {
  breakfast?: string; // e.g., "08:00"
  lunch?: string;
  dinner?: string;
  quietHoursStart?: string; // Default: "23:00"
  quietHoursEnd?: string; // Default: "07:00"
}

interface ReminderBatch {
  totalProcessed: number;
  remindersSent: number;
  remindersSkipped: number; // Already logged
  errors: number;
}
```

**Reminder Logic**:
- Check every 15 minutes for scheduled reminders
- Skip if meal already logged for time slot
- Skip if in quiet hours
- Vary message templates (10+ variations per meal type)
- Track effectiveness: did user log within 2 hours?
- Auto-reduce frequency if effectiveness <20% for 7 days
- Maximum 3 reminders per day

**Message Templates** (examples):
- Breakfast: "Morning! 🌅 Quick snap of your breakfast?", "早餐吃了什么？拍个照吧！"
- Lunch: "Lunch time at the hawker center? 🍜", "午餐时间！记得拍照哦"
- Dinner: "Dinner sorted? 🍽️ Log it to keep your streak!", "晚餐记录一下，保持连续打卡！"

### 7. Comparison Engine

**Purpose**: Passively analyze eating patterns and provide insights when relevant

**Interface**:
```typescript
interface ComparisonEngine {
  // Find similar meals
  findSimilarMeals(userId: string, currentMeal: MealLog): Promise<SimilarMeal[]>;
  
  // Get week-over-week comparison
  getWeeklyComparison(userId: string): Promise<WeeklyComparison>;
  
  // Get eating patterns
  getEatingPatterns(userId: string): Promise<EatingPattern[]>;
  
  // Get meal recall
  getMealRecall(userId: string, date: Date): Promise<MealLog[]>;
  
  // Get top foods
  getTopFoods(userId: string, limit: number): Promise<FoodFrequency[]>;
}

interface SimilarMeal {
  mealLog: MealLog;
  similarityScore: number; // 0-1
  calorieDifference: number;
  daysSince: number;
}

interface WeeklyComparison {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  changes: {
    calories: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    protein: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    mealsLogged: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  };
  insights: string[]; // e.g., ["Protein intake up 20%!", "More consistent this week"]
}

interface EatingPattern {
  pattern: string; // e.g., 'late_night_snacking', 'consistent_breakfast', 'weekend_indulgence'
  frequency: number;
  description: string;
  suggestion?: string;
}
```

**Comparison Strategy**:
- Similarity detection: fuzzy matching on food names + calorie proximity
- Pattern detection: time-based analysis, frequency analysis
- Proactive insights: only for significant positive changes (>15% improvement)
- Passive storage: all comparisons computed but not shown unless requested
- Focus on one insight at a time (avoid information overload)

## Data Models

### Database Schema

#### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dietary_type TEXT[], -- ['vegetarian', 'halal', 'keto', etc.]
  allergies JSONB, -- [{ allergen, severity, detected_from }]
  favorites TEXT[], -- Auto-populated from frequency
  eating_habits JSONB, -- { typical_meal_times, portion_preference }
  minimal_mode BOOLEAN DEFAULT FALSE,
  language_preference TEXT DEFAULT 'en', -- 'en' or 'zh'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

#### daily_budgets
```sql
CREATE TABLE daily_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calorie_target INTEGER NOT NULL,
  calories_consumed INTEGER DEFAULT 0,
  budget_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_budgets_user_date ON daily_budgets(user_id, date DESC);
```

#### streaks
```sql
CREATE TABLE streaks (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_log_date DATE,
  streak_freezes_available INTEGER DEFAULT 1,
  streak_freeze_reset_date DATE, -- Next Monday
  comeback_streak INTEGER DEFAULT 0, -- Easier streak after break
  total_meals_logged INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_current_streak ON streaks(current_streak DESC);
```

#### achievements
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'first_meal', 'week_warrior', etc.
  achievement_tier TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  earned_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- { streak_value, meals_count, etc. }
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id, earned_date DESC);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
```

#### reminders
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  scheduled_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '07:00',
  effectiveness_score FLOAT DEFAULT 0.5, -- 0-1, tracks response rate
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_enabled ON reminders(user_id, enabled);
CREATE INDEX idx_reminders_scheduled_time ON reminders(scheduled_time);
```

#### meal_history (enhanced)
```sql
-- Extends existing meal_logs table
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS similarity_hash TEXT;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_category TEXT; -- 'breakfast', 'lunch', 'dinner', 'snack'
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS tags TEXT[]; -- ['healthy', 'high_protein', 'vegetarian', etc.]
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS comparison_metadata JSONB;

CREATE INDEX idx_meal_logs_similarity ON meal_logs(user_id, similarity_hash);
CREATE INDEX idx_meal_logs_category ON meal_logs(user_id, meal_category, created_at DESC);
```

#### visual_cards
```sql
CREATE TABLE visual_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL, -- 'daily', 'weekly', 'achievement'
  generation_date TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT NOT NULL,
  data_snapshot JSONB, -- The data used to generate the card
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visual_cards_user_id ON visual_cards(user_id, generation_date DESC);
```

#### feature_discovery
```sql
CREATE TABLE feature_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  introduction_date TIMESTAMPTZ DEFAULT NOW(),
  introduction_count INTEGER DEFAULT 1,
  user_engaged BOOLEAN DEFAULT FALSE,
  last_mentioned_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

CREATE INDEX idx_feature_discovery_user ON feature_discovery(user_id, user_engaged);
```

#### user_engagement_metrics
```sql
CREATE TABLE user_engagement_metrics (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_meals_logged INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  features_enabled TEXT[], -- ['budget', 'reminders', 'social', etc.]
  last_active_date DATE,
  engagement_score FLOAT DEFAULT 0, -- 0-1, composite score
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagement_metrics_score ON user_engagement_metrics(engagement_score DESC);
CREATE INDEX idx_engagement_metrics_last_active ON user_engagement_metrics(last_active_date DESC);
```

#### social_connections (for opt-in social features)
```sql
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL, -- 'friend', 'accountability_partner'
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id, connection_type)
);

CREATE INDEX idx_social_connections_user ON social_connections(user_id, status);
```

#### community_challenges (for opt-in social features)
```sql
CREATE TABLE community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type TEXT NOT NULL, -- 'weekly_meals', 'streak_challenge', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  completion_criteria JSONB, -- { meals_required: 21, etc. }
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_challenges_dates ON community_challenges(start_date, end_date);
```

#### user_challenge_progress (for opt-in social features)
```sql
CREATE TABLE user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES community_challenges(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 0,
  completion_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenge_progress ON user_challenge_progress(challenge_id, progress_value DESC);
```

### Caching Strategy

**Redis Cache Keys**:
- `user:${userId}:preferences` - TTL: 1 hour
- `user:${userId}:streak` - TTL: 5 minutes
- `user:${userId}:budget:${date}` - TTL: until midnight
- `user:${userId}:features_discovered` - TTL: 1 hour
- `reminders:pending:${timestamp}` - TTL: 15 minutes

**Cache Invalidation**:
- Preferences: on update
- Streak: on meal log
- Budget: on meal log or midnight reset
- Features: on engagement


## Error Handling

### Error Categories and Strategies

#### 1. User Input Errors
**Scenarios**: Invalid commands, ambiguous requests, unsupported operations

**Strategy**:
- Never show technical error messages
- Provide helpful suggestions ("Did you mean 'card' or 'budget'?")
- Fall back to help menu if completely unrecognized
- Log for analytics but don't alarm user

**Example**:
```typescript
// User sends: "shwo my strek"
// Response: "Did you mean 'show my streak'? 🔥 Try: streak, stats, or help"
```

#### 2. External Service Failures
**Scenarios**: WhatsApp API down, Supabase timeout, image generation failure

**Strategy**:
- Retry with exponential backoff (3 attempts)
- Queue for later processing if non-critical
- Graceful degradation (skip optional features)
- User-friendly error messages

**Example**:
```typescript
// Card generation fails
// Response: "Oops, couldn't generate your card right now. Try again in a minute? 😊"
// Background: Log error, alert monitoring, queue retry
```

#### 3. Data Consistency Errors
**Scenarios**: Race conditions on streak updates, duplicate meal logs, missing user data

**Strategy**:
- Use database transactions for critical operations
- Optimistic locking for concurrent updates
- Idempotency keys for duplicate prevention
- Automatic data repair where possible

**Example**:
```typescript
// Concurrent streak updates
async function updateStreak(userId: string) {
  return await db.transaction(async (tx) => {
    const streak = await tx.streaks.findUnique({
      where: { user_id: userId },
      lock: 'FOR UPDATE' // Pessimistic lock
    });
    
    // Update logic with guaranteed consistency
    return await tx.streaks.update({...});
  });
}
```

#### 4. Feature Discovery Errors
**Scenarios**: Feature introduced too frequently, wrong timing, user already knows

**Strategy**:
- Double-check discovery rules before introduction
- Fail silently (skip introduction, don't break response)
- Log for analysis and rule refinement
- Allow manual override via "help" command

#### 5. Reminder Delivery Failures
**Scenarios**: WhatsApp rate limits, user blocked bot, network issues

**Strategy**:
- Respect WhatsApp rate limits (80 messages/second)
- Mark user as "unreachable" after 3 failures
- Retry failed reminders once after 5 minutes
- Don't spam user with retry attempts

#### 6. Budget/Streak Calculation Errors
**Scenarios**: Timezone issues, midnight rollover race conditions, negative values

**Strategy**:
- Always use Singapore timezone (Asia/Singapore)
- Schedule resets at 00:05 SGT (avoid midnight exactly)
- Validate all calculations (no negative streaks/budgets)
- Audit log for financial-like accuracy

### Error Monitoring and Alerting

**Critical Errors** (immediate alert):
- Database connection failures
- WhatsApp API authentication failures
- Streak data corruption
- Payment/premium feature errors (if applicable)

**Warning Errors** (daily digest):
- High rate of card generation failures
- Reminder delivery success rate <80%
- Feature discovery introduction rate anomalies
- Cache hit rate <70%

**Info Errors** (weekly review):
- Unrecognized user commands (for NLP improvement)
- Feature abandonment patterns
- Performance degradation trends

## Testing Strategy

### Testing Philosophy

Phase 3 requires a dual testing approach:
1. **Unit Tests**: Verify specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Verify universal properties across all inputs

Both are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs, while property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: fast-check (for TypeScript/JavaScript)
**Minimum Iterations**: 100 per property test
**Tagging**: Each test must reference its design document property

**Example**:
```typescript
import fc from 'fast-check';

// Feature: phase3-personalization-gamification, Property 1: Streak increment monotonicity
test('streak increments are monotonic', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 365 }), // current streak
      async (currentStreak) => {
        const result = await streakManager.incrementStreak(userId, currentStreak);
        expect(result.newStreak).toBeGreaterThanOrEqual(currentStreak);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus

Unit tests should focus on:
- Specific examples that demonstrate correct behavior
- Integration points between components
- Edge cases and error conditions
- WhatsApp message formatting
- Database query correctness

**Avoid**: Writing too many unit tests for cases covered by property tests

### Test Coverage Goals

- **Core Services**: 90%+ coverage (Streak Manager, Budget Tracker, etc.)
- **Feature Discovery**: 85%+ coverage (complex logic, many edge cases)
- **Card Generation**: 75%+ coverage (visual output, harder to test)
- **Reminder Service**: 85%+ coverage (timing-critical)
- **Integration Tests**: All critical user flows

### Testing Environments

1. **Local Development**: SQLite + mock WhatsApp API
2. **CI/CD**: Supabase test instance + mock WhatsApp API
3. **Staging**: Full Supabase + WhatsApp test number
4. **Production**: Real users + monitoring

### Test Data Generation

**For Property Tests**:
```typescript
// User generator
const userArbitrary = fc.record({
  userId: fc.uuid(),
  totalMealsLogged: fc.integer({ min: 0, max: 1000 }),
  currentStreak: fc.integer({ min: 0, max: 365 }),
  preferences: fc.record({
    dietaryType: fc.array(fc.constantFrom('vegetarian', 'vegan', 'halal', 'keto')),
    allergies: fc.array(fc.string()),
  }),
});

// Meal log generator
const mealLogArbitrary = fc.record({
  foodName: fc.string({ minLength: 1, maxLength: 100 }),
  calories: fc.integer({ min: 0, max: 5000 }),
  protein: fc.integer({ min: 0, max: 200 }),
  timestamp: fc.date(),
});
```

### Integration Test Scenarios

1. **New User Onboarding**:
   - Send first meal photo
   - Verify calorie response
   - Verify no feature introductions
   - Send second meal
   - Verify streak mention

2. **Feature Discovery Flow**:
   - Simulate 3-day streak
   - Verify reminder suggestion
   - Accept reminders
   - Verify reminder scheduled

3. **Budget Tracking**:
   - Enable budget
   - Log meals throughout day
   - Verify budget updates
   - Exceed budget
   - Verify supportive message

4. **Streak Protection**:
   - Build 7-day streak
   - Wait 20 hours without logging
   - Verify streak risk reminder
   - Use streak freeze
   - Verify streak preserved

5. **Card Generation**:
   - Request daily card
   - Verify image generated
   - Verify WhatsApp delivery
   - Check card metadata stored

### Performance Testing

**Load Testing Scenarios**:
- 1000 concurrent meal logs
- 10,000 reminders sent in 10 minutes
- 100 card generations simultaneously
- Database query performance under load

**Performance Targets**:
- Meal log response: <2 seconds (p95)
- Card generation: <3 seconds (p95)
- Reminder batch: 1000 users/minute
- Database queries: <500ms (p95)


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection and Consolidation

After analyzing all acceptance criteria, I identified several opportunities to consolidate redundant properties:

**Consolidations Made**:
1. Feature introduction spacing (0.7) and daily limit (0A.10) → Combined into single "feature introduction rate limiting" property
2. Preference extraction for dietary types (1.2) and allergies (1.3) → Combined into single "preference extraction" property
3. Budget inclusion in responses (2.5) and warning thresholds (2.6) → Combined into "budget feedback" property
4. Streak increment (3.1) and milestone achievements (3.3) → Kept separate as they test different aspects (increment vs. rewards)
5. Multiple card generation requirements → Consolidated into "card generation completeness" property

**Properties Excluded** (not testable as properties):
- Visual design quality (subjective)
- NLP understanding quality (requires human evaluation)
- Message tone and friendliness (subjective)
- Feature recommendation relevance (requires behavior analysis)

### Core Properties

**Property 1: Feature Introduction Rate Limiting**
*For any* user and any sequence of feature introductions, the system should never introduce more than 1 feature per day, and consecutive introductions should be spaced at least 2 days apart.
**Validates: Requirements 0.7, 0A.10**

**Property 2: Feature Discovery Persistence**
*For any* feature that is introduced to a user, the system should record it in the feature_discovery table, and after 2 ignores, should not re-introduce it unless explicitly requested.
**Validates: Requirements 0.9, 0.10, 0A.11**

**Property 3: Preference Extraction Completeness**
*For any* message containing dietary keywords (vegetarian, vegan, halal, keto, etc.) or allergy mentions (allergic to X, can't eat Y), the system should extract and store the preference in the user_preferences table.
**Validates: Requirements 1.2, 1.3**

**Property 4: Allergen Warning Consistency**
*For any* food item that contains a user's known allergen, the system should include a warning in the response message.
**Validates: Requirements 1.4**

**Property 5: Budget Feedback Completeness**
*For any* user with active budget tracking, when logging a meal, the response should include remaining budget, and when remaining budget falls below 20%, should include a warning note.
**Validates: Requirements 2.5, 2.6**

**Property 6: Streak Increment Monotonicity**
*For any* user with current streak N, logging a meal on a new day should result in streak N+1 (or N if streak freeze used).
**Validates: Requirements 3.1**

**Property 7: Streak Freeze Availability**
*For any* user, streak freezes should reset to 1 every Monday, and should be available for use when streak is about to break.
**Validates: Requirements 3.2**

**Property 8: Achievement Award Consistency**
*For any* user reaching a milestone streak (3, 7, 14, 21, 30, 60, 90 days), the system should award the corresponding achievement exactly once.
**Validates: Requirements 3.3**

**Property 9: Meal Similarity Detection**
*For any* two meals with >90% similarity score (based on food names and calorie proximity), the system should detect them as similar and offer comparison.
**Validates: Requirements 6.1**

**Property 10: Data Encryption at Rest**
*For any* user preference data stored in the database, the sensitive fields (allergies, health conditions) should be encrypted using AES-256.
**Validates: Requirements 8.1**

**Property 11: Core Experience Simplicity**
*For any* food photo sent by a user (without active optional features), the response should contain only calorie information and basic encouragement, with no feature promotions.
**Validates: Requirements 9.1**

**Property 12: Reminder Frequency Limit**
*For any* user with reminders enabled, the system should send at most 3 reminders per day, and should skip reminders if meal already logged for that time slot.
**Validates: Requirements 5.4, 5.5, 5.12**

### Invariant Properties

**Property 13: Streak Non-Negativity**
*For all* users at all times, current_streak >= 0 and longest_streak >= current_streak.
**Validates: System integrity**

**Property 14: Budget Consistency**
*For all* users with active budgets, calories_consumed should equal the sum of all meal calories logged that day.
**Validates: Requirements 2.8**

**Property 15: Feature Discovery Uniqueness**
*For all* users and features, there should be at most one record in feature_discovery table per (user_id, feature_name) pair.
**Validates: Requirements 0.10**

### Round-Trip Properties

**Property 16: Preference Storage Round-Trip**
*For any* user preference set via command or extracted from message, retrieving preferences should return the same value.
**Validates: Requirements 1.8**

**Property 17: Card Generation Idempotency**
*For any* user and date, generating a daily card twice should produce equivalent visual content (same data, same layout).
**Validates: Requirements 4.2, 4.3**

### Error Handling Properties

**Property 18: Graceful Degradation**
*For any* external service failure (WhatsApp API, image generation), the system should continue processing other features and provide partial response rather than complete failure.
**Validates: Error handling strategy**

**Property 19: Transaction Atomicity**
*For any* streak update operation, either all changes (streak increment, achievement award, database update) succeed together, or all fail together (no partial updates).
**Validates: Requirements 3.1, 3.3, data consistency**

### Edge Case Properties

**Property 20: Midnight Rollover Correctness**
*For any* user logging a meal within 5 minutes of midnight SGT, the meal should be attributed to the correct day based on Singapore timezone.
**Validates: Requirements 2.3, 3.1, timezone handling**

**Property 21: Empty State Handling**
*For any* new user with no meal history, requesting comparisons, stats, or cards should return appropriate "no data yet" messages rather than errors.
**Validates: Requirements 6.2, 6.8, 4.2**

**Property 22: Concurrent Update Safety**
*For any* two simultaneous meal logs from the same user, both should be recorded, and streak should increment exactly once (not twice).
**Validates: Requirements 3.1, data consistency**

### Social Feature Properties (Opt-In)

**Property 23: Social Feature Isolation**
*For any* user who has not opted into social features, no social-related data (connections, challenges, leaderboards) should appear in any response.
**Validates: Requirements 6A.1, 6A.13**

**Property 24: Referral Reward Symmetry**
*For any* successful referral, both the referrer and the referred user should receive bonus achievements.
**Validates: Requirements 6A.6**

### Performance Properties

**Property 25: Response Time Bounds**
*For any* meal log request, the system should respond within 3 seconds (95th percentile), including all feature checks and database updates.
**Validates: Requirements 10.1, 10.2, 10.3**

**Property 26: Reminder Batch Processing**
*For any* reminder batch, the system should process at least 1000 users per minute without degradation.
**Validates: Requirements 10.5**

### Testing Implementation Notes

Each property above should be implemented as a property-based test using fast-check with minimum 100 iterations. Example structure:

```typescript
import fc from 'fast-check';

// Feature: phase3-personalization-gamification, Property 6: Streak Increment Monotonicity
describe('Streak Manager Properties', () => {
  test('streak increments are monotonic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          currentStreak: fc.integer({ min: 0, max: 365 }),
          lastLogDate: fc.date(),
        }),
        async ({ userId, currentStreak, lastLogDate }) => {
          // Setup: Create user with current streak
          await setupUserStreak(userId, currentStreak, lastLogDate);
          
          // Action: Log a meal on a new day
          const result = await streakManager.updateStreak(userId);
          
          // Assert: New streak should be current + 1
          expect(result.currentStreak).toBe(currentStreak + 1);
          
          // Cleanup
          await cleanupUser(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Property Test Generators

**User Generator**:
```typescript
const userArbitrary = fc.record({
  userId: fc.uuid(),
  totalMealsLogged: fc.integer({ min: 0, max: 1000 }),
  currentStreak: fc.integer({ min: 0, max: 365 }),
  longestStreak: fc.integer({ min: 0, max: 365 }),
  preferences: fc.record({
    dietaryType: fc.array(fc.constantFrom('vegetarian', 'vegan', 'halal', 'keto', 'paleo')),
    allergies: fc.array(fc.record({
      allergen: fc.constantFrom('peanuts', 'shellfish', 'dairy', 'gluten', 'soy'),
      severity: fc.constantFrom('mild', 'moderate', 'severe'),
    })),
  }),
});
```

**Meal Log Generator**:
```typescript
const mealLogArbitrary = fc.record({
  foodName: fc.string({ minLength: 1, maxLength: 100 }),
  calories: fc.integer({ min: 50, max: 2000 }),
  protein: fc.integer({ min: 0, max: 100 }),
  carbs: fc.integer({ min: 0, max: 200 }),
  fats: fc.integer({ min: 0, max: 100 }),
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  mealCategory: fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
});
```

**Feature Introduction Generator**:
```typescript
const featureIntroductionArbitrary = fc.record({
  featureName: fc.constantFrom('reminders', 'budget', 'cards', 'compare', 'social'),
  introductionDate: fc.date(),
  userEngaged: fc.boolean(),
});
```

### Property Test Coverage Goals

- **Streak Management**: 8 properties (6, 7, 8, 13, 19, 20, 22)
- **Feature Discovery**: 3 properties (1, 2, 15)
- **Preferences**: 4 properties (3, 4, 10, 16)
- **Budget Tracking**: 2 properties (5, 14)
- **Comparison Engine**: 1 property (9)
- **Core Experience**: 2 properties (11, 21)
- **Reminders**: 1 property (12)
- **Card Generation**: 1 property (17)
- **Social Features**: 2 properties (23, 24)
- **Performance**: 2 properties (25, 26)
- **Error Handling**: 2 properties (18, 19)

**Total**: 26 properties covering all critical system behaviors

