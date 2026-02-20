# Requirements Document: Phase 3 Personalization & Gamification

## Introduction

This document specifies the requirements for Phase 3 of the WhatsApp Health Bot, focusing on user engagement, retention, and personalization features. Building upon the existing food recognition and calorie tracking capabilities, Phase 3 introduces personalized preferences, budget tracking, gamification elements, shareable visual content, intelligent reminders, and comparison memory to create a more engaging and sticky user experience.

The system targets health-conscious individuals in Singapore who use WhatsApp as their primary communication platform, providing culturally relevant features that encourage consistent healthy eating habits through positive reinforcement and personalized insights.

## User Psychology & Retention Strategy

### Core Design Philosophy: Progressive Enhancement

**Simple by Default, Powerful by Choice**

Phase 3 follows a "zero-configuration" approach where:
- Core features work automatically without user setup
- Advanced features are opt-in and discoverable gradually
- Users never feel overwhelmed or required to learn complex systems
- Every feature can be ignored without breaking the experience

### Complexity Management Principles

1. **Invisible Intelligence**
   - System learns and adapts in the background
   - Users see benefits without understanding mechanics
   - No mandatory configuration or setup wizards

2. **Progressive Disclosure**
   - New users see only: meal logging + basic feedback
   - Features unlock naturally through usage (e.g., streak appears after 2nd day)
   - Advanced features suggested contextually, never forced

3. **Conversational, Not Technical**
   - No menus, settings pages, or complex interfaces
   - Everything works through natural WhatsApp messages
   - Users talk to bot like a friend, not a system

4. **Opt-In Complexity**
   - Social features: completely optional
   - Reminders: off by default, easy one-message enable
   - Detailed tracking: available but not required
   - Visual cards: generated on request, not automatically

### User Journey Simplicity

**Day 1 User**: Send food photo → Get calorie info. That's it.

**Day 3 User**: Bot mentions "You're on a 3-day streak! 🔥" (automatic, no setup)

**Week 1 User**: Bot suggests "Want a summary card of your week?" (optional)

**Week 2 User**: Bot asks "Would you like daily reminders?" (opt-in)

**Month 1 User**: Discovers social features through natural exploration

### Core Retention Principles

1. **Variable Rewards (Dopamine Triggers)**
   - Automatic, no user action needed
   - Surprise celebrations appear naturally

2. **Loss Aversion (Streak Protection)**
   - Streaks count automatically
   - Streak freeze offered when needed (not explained upfront)

3. **Social Proof (Optional)**
   - Completely opt-in
   - Users can ignore all social features

4. **Progress Visualization**
   - Available on request ("show my progress")
   - Not pushed unless user interested

### User Pain Points Addressed (Simply)

- **Forgetting to log**: Optional reminders (one message to enable)
- **Losing motivation**: Automatic streaks and celebrations
- **Not seeing progress**: Ask "how am I doing?" anytime
- **Boring experience**: Varied responses, no repetition

### User Delight Points (爽点) - Zero Effort

- **Instant gratification**: Every meal log gets immediate, varied feedback
- **Unexpected rewards**: Achievements appear automatically
- **Effortless tracking**: Just send photo, bot handles everything
- **Personalized intelligence**: Bot learns silently, no configuration

## Glossary

- **System**: The WhatsApp Health Bot application
- **User**: A registered individual interacting with the bot via WhatsApp
- **Preference_Store**: The database component storing user dietary preferences and settings
- **Budget_Tracker**: The component monitoring daily calorie budgets (optional feature)
- **Streak_Manager**: The component tracking consecutive days of user engagement
- **Card_Generator**: The component creating shareable visual summary cards (on-demand)
- **Reminder_Service**: The component managing time-based notifications (opt-in)
- **Comparison_Engine**: The component analyzing historical meal data (passive)
- **Meal_Log**: A recorded entry of food consumption with nutritional data
- **Achievement**: A milestone or badge earned through specific user behaviors
- **Visual_Card**: A formatted image summarizing user progress or achievements
- **Daily_Budget**: The target calorie limit set by the user (optional)
- **Streak**: Consecutive days of logging at least one meal
- **Supabase**: The backend database and authentication service
- **WhatsApp_API**: The Meta WhatsApp Business API for message delivery
- **Core_Experience**: The essential flow: send photo → get calorie info
- **Progressive_Enhancement**: Advanced features that enhance but don't complicate core experience
- **Opt-In_Feature**: A feature that is disabled by default and requires explicit user activation

## Requirement 0: Simplicity and Progressive Enhancement Principle

**User Story:** As a new user, I want to be gently guided to discover features at the right time, so that I learn the system naturally without feeling overwhelmed or lost.

#### Acceptance Criteria

1. WHEN a new user sends their first food photo, THE System SHALL respond with calorie information and add: "I'll help you track your meals! 📊"
2. WHEN a user logs their 2nd meal, THE System SHALL add one line: "You're building a streak! Log daily to keep it going 🔥"
3. WHEN a user reaches day 3 streak, THE System SHALL celebrate and offer: "Want daily reminders to keep your streak? Reply 'yes' or 'no'"
4. WHEN a user logs 7 meals total, THE System SHALL mention once: "Try 'card' to see your weekly summary, or 'help' for more features"
5. WHEN a user reaches day 7 streak, THE System SHALL suggest: "You're doing great! Want to set a daily calorie budget? Reply 'budget' to start"
6. WHEN a user reaches day 14 streak, THE System SHALL mention social features once: "Did you know you can challenge friends? Reply 'social' to learn more"
7. THE System SHALL space out feature introductions by at least 2 days to avoid overwhelming
8. WHEN introducing a feature, THE System SHALL explain it in one sentence with clear next step
9. WHEN a user ignores a feature suggestion twice, THE System SHALL not mention that feature again unless user asks
10. THE System SHALL maintain a "feature discovery log" to track what has been introduced to each user
11. WHEN a user sends "help" or "features" or "功能", THE System SHALL show a simple menu of available features with one-line descriptions
12. THE System SHALL never require configuration or setup wizards - all features work with smart defaults
13. WHEN a user enables any feature, THE System SHALL confirm and explain how to disable it
14. THE System SHALL prioritize response speed over feature richness (fast simple response > slow detailed response)
15. WHEN a user sends "too much" or "简化", THE System SHALL reduce information density and mark user preference for minimal mode

### Requirement 0A: Contextual Feature Discovery

**User Story:** As a user, I want to discover relevant features at moments when they would be most useful, so that I learn about capabilities naturally through my usage patterns.

#### Acceptance Criteria

1. WHEN a user logs the same meal 3 times, THE System SHALL mention once: "I remember your meals! Try 'compare' to see how today compares to before"
2. WHEN a user asks "how am I doing?" for the first time, THE System SHALL show progress and add: "Want a shareable card? Try 'card'"
3. WHEN a user logs a meal late at night (after 10pm) for 3 consecutive days, THE System SHALL suggest: "Late night snacking? I can remind you to log earlier. Reply 'reminders' to set up"
4. WHEN a user mentions an allergy in conversation, THE System SHALL confirm: "Got it, I'll remember you're allergic to [X] and warn you if I detect it"
5. WHEN a user breaks a 7+ day streak, THE System SHALL send supportive message: "Streaks can be tough! Next time you'll have 1 streak freeze to protect it. Keep going! 💪"
6. WHEN a user achieves a milestone (7, 14, 30 days), THE System SHALL offer: "Congrats on [X] days! Want a celebration card to share? Reply 'card'"
7. WHEN a user logs meals consistently for 5 days, THE System SHALL mention: "You're consistent! Try 'stats' to see your patterns"
8. WHEN a user asks about a food's calories, THE System SHALL add: "Tip: Send me a photo next time for instant recognition!"
9. WHEN a user logs 3 meals in one day for the first time, THE System SHALL celebrate: "Full day logged! 🎉 This helps me give you better insights"
10. THE System SHALL never introduce more than 1 new feature per day per user
11. WHEN a user actively uses a suggested feature, THE System SHALL mark it as "discovered" and not re-introduce it
12. THE System SHALL prioritize introducing features that match user's behavior patterns (e.g., suggest budget to calorie-conscious users, social to engaged users)

## Requirements

### Requirement 1: User Personalization Preferences Storage (Passive Learning)

**User Story:** As a user, I want the bot to learn my preferences naturally over time, so that I get personalized experience without filling out forms or settings.

#### Acceptance Criteria

1. THE System SHALL not require any preference setup during onboarding
2. WHEN a user mentions dietary preferences in conversation (e.g., "I'm vegetarian"), THE Preference_Store SHALL quietly save it
3. WHEN a user mentions allergies (e.g., "I'm allergic to peanuts"), THE Preference_Store SHALL store it with high priority
4. WHEN analyzing food images containing known allergens, THE System SHALL warn the user (e.g., "⚠️ This might contain peanuts")
5. WHEN a user sends "preferences" or "settings" or "设置", THE System SHALL show what it has learned and allow edits
6. THE Preference_Store SHALL learn favorite foods from logging frequency (foods logged 5+ times become favorites)
7. THE System SHALL use preferences to provide better suggestions but never force them
8. WHEN a user updates any preference, THE System SHALL confirm with a simple message
9. THE Preference_Store SHALL support multiple dietary preferences (e.g., vegetarian + gluten-free) without user explicitly combining them
10. THE System SHALL store preference data with encryption for privacy
11. THE System SHALL never proactively ask about preferences unless user mentions food restrictions in context

### Requirement 2: Daily Budget Tracking System (Optional)

**User Story:** As a user who wants to manage my calorie intake, I want to optionally set a daily budget and see my progress, so that I can track limits without being forced to if I don't care about budgets.

#### Acceptance Criteria

1. THE System SHALL not require or prompt for budget setup during onboarding
2. WHEN a user sends "budget" or "set budget" or "预算", THE System SHALL ask for their daily calorie target
3. WHEN a user sets a daily calorie budget, THE Budget_Tracker SHALL store it and reset at midnight Singapore time
4. WHEN a user with an active budget logs a meal, THE System SHALL include remaining budget in the response (e.g., "650 cal remaining today")
5. WHEN remaining budget falls below 20%, THE System SHALL add a gentle note (e.g., "Getting close to your limit 😊")
6. WHEN a user exceeds their budget, THE System SHALL provide supportive feedback (e.g., "Over budget today, but tomorrow's a fresh start!")
7. WHEN a user requests "budget status", THE System SHALL show consumed vs. remaining with simple percentage
8. THE System SHALL allow users to disable budget tracking anytime with "budget off"
9. WHEN budget is disabled, THE System SHALL never mention calories remaining or budget status
10. THE Budget_Tracker SHALL maintain 30-day history for users who want to see trends (via "budget history" command)
11. THE System SHALL not send any proactive budget warnings or notifications unless user explicitly enables "budget alerts"

### Requirement 3: Streak Tracking and Gamification

**User Story:** As a user, I want to track my consecutive days of logging meals and earn achievements, so that I feel motivated to maintain consistent healthy habits.

#### Acceptance Criteria

1. WHEN a user logs at least one meal in a day, THE Streak_Manager SHALL increment their current streak counter
2. WHEN a user fails to log any meal for 24 hours, THE Streak_Manager SHALL offer ONE streak freeze opportunity per week to preserve the streak
3. WHEN a user reaches milestone streaks (3, 7, 14, 21, 30, 60, 90 days), THE System SHALL award an achievement badge with celebratory animation description
4. WHEN a user earns an achievement, THE System SHALL send a congratulatory message with personalized encouragement based on their progress
5. THE System SHALL maintain an achievements collection including: First Meal, 3-Day Starter, Week Warrior, Month Master, Budget Champion, Protein Pro, Veggie Lover, Early Bird, Balanced Eater, Hydration Hero
6. WHEN a user requests their stats, THE System SHALL display current streak, longest streak, total meals logged, earned achievements, and rank among friends (if social features enabled)
7. THE Streak_Manager SHALL send contextual motivational messages at milestones (e.g., "🔥 7天连续打卡！你已经超过85%的用户！")
8. WHEN a user is about to lose their streak (20 hours without logging), THE System SHALL send an urgent but supportive reminder with their current streak count
9. THE System SHALL use positive, encouraging language with cultural relevance (Singlish phrases, Chinese idioms) in gamification messages
10. WHEN a user breaks a long streak (>14 days), THE System SHALL send a supportive "comeback" message and highlight their previous achievement to re-engage them
11. THE System SHALL award bonus points for logging all three main meals in a day (breakfast, lunch, dinner)
12. WHEN a user reaches a new personal best, THE System SHALL mention "Want a celebration card?" to encourage sharing

### Requirement 3A: Quick Wins and Re-engagement

**User Story:** As a user, I want to experience early successes and easy paths back when I fall off, so that I stay motivated even when I'm not perfect.

#### Acceptance Criteria

1. WHEN a user logs their first meal, THE System SHALL award "First Step" achievement immediately with celebration
2. WHEN a user logs 3 meals in their first day, THE System SHALL award "Strong Start" bonus achievement
3. WHEN a user breaks a streak, THE System SHALL start a "comeback streak" counter that's easier to achieve (only needs 3 days to get "Comeback Kid" badge)
4. WHEN a user returns after 7+ days inactive, THE System SHALL offer a "fresh start" with encouraging message and reset expectations
5. THE System SHALL award "Weekend Warrior" achievement for logging on both Saturday and Sunday (easier than daily streaks)
6. WHEN a user logs a healthy meal (high protein, lots of veggies), THE System SHALL occasionally give instant positive feedback (e.g., "Great choice! 🥗")
7. THE System SHALL create "micro-achievements" that are easy to earn (e.g., "Morning Person" for logging breakfast 3 times)
8. WHEN a user has been inactive for 3 days, THE System SHALL send ONE message highlighting their past achievements and offering easy re-entry
9. THE System SHALL never make users feel guilty about breaks - always frame as "welcome back" not "you failed"
10. WHEN a user restarts after a break, THE System SHALL show their all-time stats (not just current streak) to remind them of past success

### Requirement 4: Shareable Visual Cards (On-Demand)

**User Story:** As a user who wants to celebrate my progress, I want to generate beautiful visual summary cards when I choose to, so that I can share achievements without being forced to engage with this feature.

#### Acceptance Criteria

1. WHEN a user sends "card" or "卡片" or "summary", THE System SHALL ask what type: daily, weekly, or achievement
2. WHEN a user requests a daily summary card, THE Card_Generator SHALL create a clean, beautiful image with total calories, top meals, and streak status
3. WHEN a user requests a weekly summary card, THE Card_Generator SHALL create an image with 7-day trends and key highlights
4. THE Card_Generator SHALL use Instagram-worthy design with one default theme (clean, modern, Singapore-inspired)
5. WHEN a user reaches a major milestone (7, 30, 90 day streak), THE System SHALL mention "Want a celebration card?" (not auto-generate)
6. WHEN a card is generated, THE System SHALL send it as a high-quality WhatsApp image with a simple caption
7. THE Card_Generator SHALL include contextual motivational text relevant to user's progress
8. THE System SHALL allow users to request cards anytime without limits (but not push them)
9. THE Card_Generator SHALL optimize images for WhatsApp (under 2MB, 1080x1350px portrait)
10. WHEN generating cards, THE System SHALL include user's nickname if set, otherwise anonymous
11. THE Card_Generator SHALL support bilingual text (English + Chinese) based on user's primary language
12. THE System SHALL never automatically generate or send cards unless explicitly requested by user

### Requirement 5: Time-based Reminders (Opt-In)

**User Story:** As a user who wants help staying consistent, I want to optionally enable smart reminders that adapt to my behavior, so that I can get helpful nudges without feeling spammed.

#### Acceptance Criteria

1. THE System SHALL keep reminders disabled by default for all new users
2. WHEN a user reaches day 3 streak, THE System SHALL make ONE gentle suggestion: "Want daily reminders to keep your streak going? Reply 'yes' to enable"
3. WHEN a user enables reminders with "yes" or "reminders on", THE Reminder_Service SHALL ask for preferred meal times or use smart defaults (8am, 12pm, 7pm)
4. WHEN a reminder time arrives and no meal has been logged, THE System SHALL send ONE contextually relevant WhatsApp message
5. WHEN a user has already logged a meal for that time slot, THE Reminder_Service SHALL skip the reminder completely
6. THE System SHALL allow users to instantly disable reminders by replying "stop" or "reminders off" to any reminder
7. WHEN a user consistently ignores reminders (3+ days), THE System SHALL automatically reduce frequency or suggest disabling
8. THE Reminder_Service SHALL respect quiet hours with smart defaults (11pm-7am) that users can adjust
9. WHEN sending reminders, THE System SHALL use varied, engaging message templates to avoid repetition
10. THE Reminder_Service SHALL send "streak protection" reminders ONLY when user has 7+ day streak and hasn't logged for 20 hours
11. WHEN a user hasn't logged for 7+ days, THE System SHALL send ONE "we miss you" message with their previous achievements, then stop
12. THE System SHALL limit reminders to maximum 3 per day to prevent annoyance

### Requirement 6: Comparison Memory Feature (Passive Intelligence)

**User Story:** As a user, I want the bot to quietly remember my eating patterns and provide helpful insights when relevant, so that I can learn from my habits without being overwhelmed by data.

#### Acceptance Criteria

1. WHEN a user logs a meal very similar to a previous one (>90% match), THE Comparison_Engine SHALL optionally mention it briefly (e.g., "Similar to Tuesday's lunch, but 50 cal less 👍")
2. WHEN a user asks "how am I doing?" or "progress" or "进度", THE System SHALL show a simple week-over-week comparison
3. THE Comparison_Engine SHALL silently identify eating patterns but only mention them when directly relevant or asked
4. WHEN a user requests "compare", THE System SHALL offer simple options: today vs yesterday, this week vs last week
5. THE Comparison_Engine SHALL celebrate clear improvements automatically (e.g., "Your protein is up 20% this week! 💪") but max once per week
6. WHEN a user logs the same meal 5+ times in a week, THE System SHALL make ONE gentle suggestion for variety
7. THE Comparison_Engine SHALL maintain meal history silently without requiring user action
8. WHEN a user asks "what did I eat [day]?", THE System SHALL provide simple meal recall
9. THE Comparison_Engine SHALL identify user's top 3 most-logged foods but only share when asked ("stats" command)
10. THE System SHALL avoid overwhelming users with comparisons unless they explicitly request detailed analysis
11. WHEN providing comparisons, THE System SHALL use simple language and focus on one key insight at a time
12. THE Comparison_Engine SHALL never proactively send comparison messages unless celebrating significant positive change

### Requirement 6A: Social Features and Community Engagement (Optional)

**User Story:** As an engaged user who wants more, I want to optionally connect with friends and see community achievements, so that I can add social motivation without complicating my basic experience.

#### Acceptance Criteria

1. THE System SHALL keep all social features completely opt-in with no prompts until user explicitly asks
2. WHEN a user sends "social" or "friends" or "社交", THE System SHALL explain available social features and ask if they want to enable
3. WHEN a user opts into social features, THE System SHALL show anonymous community stats (e.g., "You're in the top 15% of users this week!")
4. THE System SHALL create optional weekly community challenges (e.g., "Log 21 meals this week") that users can join by replying "join"
5. WHEN a user completes a community challenge, THE System SHALL display their rank and reward with exclusive badges
6. THE System SHALL allow users to invite friends via simple referral link, rewarding both with bonus achievements
7. WHEN a user shares a referral link, THE System SHALL track conversions but never spam or pressure
8. THE System SHALL provide optional "accountability partner" feature where two users can see each other's daily logging status
9. WHEN a user's accountability partner hasn't logged today, THE System SHALL allow sending a friendly nudge (max 1 per day)
10. THE System SHALL create monthly leaderboards with privacy-preserving anonymous rankings (opt-in only)
11. WHEN sharing visual cards, THE System SHALL include subtle "challenge your friends" text (not pushy)
12. THE System SHALL allow users to completely disable all social features with one command ("social off")
13. THE System SHALL never mention social features in regular meal logging responses unless user has opted in

### Requirement 7: Database Schema and Data Management

**User Story:** As a system administrator, I want a well-structured database schema that supports all personalization and gamification features, so that data is organized, scalable, and performant.

#### Acceptance Criteria

1. THE System SHALL create a `user_preferences` table with columns for dietary_type, allergies, favorites, eating_habits, reminder_settings, minimal_mode, and timestamps
2. THE System SHALL create a `daily_budgets` table tracking date, user_id, calorie_target, calories_consumed, budget_enabled, and budget_status
3. THE System SHALL create a `streaks` table storing user_id, current_streak, longest_streak, last_log_date, streak_freezes_available, streak_history, and milestone_achievements
4. THE System SHALL create an `achievements` table with user_id, achievement_type, achievement_tier, earned_date, metadata, and share_count
5. THE System SHALL create a `reminders` table with user_id, reminder_type, scheduled_time, enabled status, quiet_hours, and effectiveness_score
6. THE System SHALL create a `meal_history` table with enhanced fields for comparison (similarity_hash, meal_category, tags, location_context, comparison_metadata)
7. THE System SHALL create a `visual_cards` table storing card_id, user_id, card_type, generation_date, theme, share_count, and image_url
8. THE System SHALL create a `social_connections` table with user_id, friend_id, connection_type, and status (for opt-in social features)
9. THE System SHALL create a `community_challenges` table with challenge_id, challenge_type, start_date, end_date, participants_count, and completion_criteria
10. THE System SHALL create a `user_challenge_progress` table tracking user_id, challenge_id, progress_value, completion_status, and rank
11. THE System SHALL create a `feature_discovery` table tracking user_id, feature_name, introduction_date, introduction_count, user_engaged, and last_mentioned_date
12. THE System SHALL create a `user_engagement_metrics` table storing user_id, total_meals_logged, days_active, features_enabled, last_active_date, and engagement_score
13. WHEN storing user data, THE System SHALL use Supabase Row Level Security (RLS) policies to ensure users can only access their own data and authorized social connections
14. THE System SHALL create database indexes on frequently queried fields (user_id, date, streak values, challenge_id, feature_name)
15. WHEN a user deletes their account, THE System SHALL cascade delete all related personalization data while preserving anonymized community statistics
16. THE System SHALL implement database migrations for schema changes with rollback capability and zero-downtime deployment
17. THE System SHALL use materialized views for expensive queries (leaderboards, community stats) with 5-minute refresh intervals

### Requirement 8: Privacy and Data Protection

**User Story:** As a user, I want my personal health data to be securely stored and protected, so that I can trust the system with my sensitive information.

#### Acceptance Criteria

1. THE System SHALL encrypt all user preference data at rest using AES-256 encryption
2. WHEN transmitting data to WhatsApp API, THE System SHALL use HTTPS/TLS encryption
3. THE System SHALL implement data retention policies, automatically deleting data older than 2 years unless user opts for longer retention
4. WHEN a user requests data export, THE System SHALL provide all their data in JSON format within 48 hours
5. WHEN a user requests data deletion, THE System SHALL permanently remove all personal data within 7 days
6. THE System SHALL not share user data with third parties without explicit consent
7. THE System SHALL log all data access attempts for security auditing
8. WHEN storing sensitive data (allergies, health conditions), THE System SHALL use additional encryption layers
9. THE System SHALL comply with PDPA (Personal Data Protection Act) Singapore requirements
10. THE System SHALL provide clear privacy policy information accessible via WhatsApp command

### Requirement 9: WhatsApp Integration and User Experience (Simplicity First)

**User Story:** As a user, I want to interact with the bot naturally through WhatsApp without learning commands or navigating menus, so that using it feels effortless.

#### Acceptance Criteria

1. WHEN a user sends a food photo, THE System SHALL respond with calorie info and nothing else (core experience)
2. WHEN a user sends natural questions (e.g., "how's my streak?", "我的进度?"), THE System SHALL understand and respond simply
3. THE System SHALL never show command lists or menus unless user asks "help" or "commands"
4. WHEN a user sends "help", THE System SHALL show 5 most useful commands in simple format
5. THE System SHALL respond to all messages within 2 seconds with typing indicators for image processing
6. WHEN displaying information, THE System SHALL use minimal formatting (emojis, line breaks) for clarity
7. THE System SHALL maintain conversation context for 5 minutes, allowing follow-up questions
8. WHEN a user achieves a milestone, THE System SHALL send ONE celebration message (not multiple)
9. THE System SHALL support both English and Chinese naturally without requiring language selection
10. WHEN a user seems confused (sends "?" or "what"), THE System SHALL offer contextual help
11. THE System SHALL never send unsolicited messages except: streak protection (if 7+ days) and one re-engagement (if 7+ days inactive)
12. THE System SHALL limit automated messages to maximum 1 per day (excluding direct responses to user messages)
13. WHEN a user sends "stop" or "pause", THE System SHALL disable all automated messages and confirm
14. THE System SHALL use conversational, friendly language without corporate or robotic tone

### Requirement 10: Performance and Scalability

**User Story:** As a system administrator, I want Phase 3 features to perform efficiently at scale, so that the system can handle growing user base without degradation.

#### Acceptance Criteria

1. WHEN calculating budget status, THE System SHALL retrieve and compute results within 500ms
2. WHEN generating visual cards, THE Card_Generator SHALL create images within 2 seconds
3. THE Comparison_Engine SHALL query meal history and return results within 1 second for 90-day lookups
4. THE System SHALL cache frequently accessed user preferences in memory for faster retrieval
5. WHEN sending reminders, THE Reminder_Service SHALL batch process up to 1000 users per minute
6. THE System SHALL use database connection pooling to handle concurrent requests efficiently
7. WHEN streak data is updated, THE System SHALL use optimistic locking to prevent race conditions
8. THE System SHALL implement rate limiting on card generation (max 10 cards per user per day)
9. WHEN system load is high, THE System SHALL prioritize real-time meal logging over background tasks
10. THE System SHALL monitor performance metrics and alert administrators when response times exceed thresholds

## Technical Considerations

### Database Schema Extensions

The following tables extend the existing Supabase schema:

- `user_preferences`: Stores dietary preferences, allergies, favorites
- `daily_budgets`: Tracks daily calorie/macro budgets and consumption
- `streaks`: Manages streak counters and achievement tracking
- `achievements`: Records earned badges and milestones
- `reminders`: Stores user reminder preferences and schedules
- `meal_comparisons`: Cached comparison data for performance
- `visual_cards`: Metadata for generated cards (optional caching)

### WhatsApp API Integration

- All features must work within WhatsApp message constraints (text, images, buttons)
- Visual cards sent as image messages with captions
- Interactive buttons for quick actions where supported
- Fallback to text commands for all features

### Localization

- Full bilingual support (English/Chinese) for all user-facing text
- Singapore-specific cultural considerations (hawker food, local eating patterns)
- Date/time formatting in Singapore conventions

### Background Jobs

- Streak reset checks (daily at midnight SGT)
- Reminder dispatch (scheduled based on user preferences)
- Budget reset (daily at midnight SGT)
- Data cleanup and archival (weekly)

## Success Metrics

### Primary Retention Metrics (Core KPIs)
- **Day 1 Retention**: 70% of new users return next day (target, industry standard: 40-50%)
- **Day 7 Retention**: 50% of users active after 7 days (target, industry standard: 20-30%)
- **Day 30 Retention**: 35% of users active after 30 days (target, industry standard: 10-15%)
- **Average Session Frequency**: 2+ interactions per day (target, realistic for meal logging)
- **Churn Recovery**: 25% of inactive users (7+ days) re-engage after reminder (target)

### Engagement Metrics (User Stickiness)
- **Daily Active Users (DAU)**: 50% of registered users (target, sustainable level)
- **Average Streak Length**: 14 days (target, realistic with streak freezes)
- **Feature Adoption Rate**: 60% of users enable at least 2 Phase 3 features (target, focused adoption)
- **Meals Logged Per Day**: 2.0 average (target, breakfast + lunch or lunch + dinner)
- **Time to First Action**: <60 seconds after reminder (target, accounting for user context)

### Viral Growth Metrics (User Acquisition)
- **Card Sharing Rate**: 20% of users share at least one card per month (target, realistic sharing behavior)
- **Referral Conversion**: 15% of invited friends complete registration (target, typical referral rate)
- **Social Feature Adoption**: 30% of users try at least one social feature (target, opt-in nature)
- **Viral Coefficient**: 0.3+ (each user brings 0.3 new users on average, sustainable growth)

### User Experience Metrics (Satisfaction)
- **Command Success Rate**: 90% of user commands understood correctly (target, accounting for ambiguity)
- **Response Time**: <3 seconds for 95% of interactions (target, including image processing)
- **Reminder Effectiveness**: 40% of reminder recipients log meal within 2 hours (target, realistic window)
- **Feature Discovery**: 70% of users discover at least 3 Phase 3 features within first 2 weeks (target, gradual discovery)
- **User Satisfaction Score**: 4.2/5 based on in-app feedback (target, excellent but achievable)

### Business Impact Metrics
- **Customer Lifetime Value (LTV)**: Increase by 40% through improved retention (target, measurable improvement)
- **Cost Per Acquisition (CPA)**: Decrease by 20% through viral growth (target, modest but meaningful)
- **Premium Conversion**: 10% of active users upgrade to premium features if applicable (target, typical freemium conversion)
- **Support Ticket Volume**: <8% of users require support (target, indicating good but not perfect UX)

### Early Warning Indicators (Monitor for Issues)
- **Feature Abandonment**: <15% of users who try a feature disable it within 7 days
- **Notification Opt-Out Rate**: <10% of users disable all notifications
- **Streak Break Rate**: <40% of users with 7+ day streaks break them in next 7 days
- **Re-engagement Success**: >20% of "we miss you" messages result in user returning within 48 hours
