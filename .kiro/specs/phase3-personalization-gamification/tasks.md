# Implementation Plan: Phase 3 Personalization & Gamification

## Overview

This implementation plan breaks down Phase 3 features into incremental, testable tasks. The approach follows a "core-first" strategy: implement essential infrastructure, then layer on features progressively, testing at each step.

**Key Principles**:
- Each task builds on previous tasks
- Core functionality validated early through code
- Property-based tests written alongside implementation
- Features remain opt-in and non-breaking to existing flows

**Technology Stack**:
- TypeScript + Next.js (existing)
- Supabase (PostgreSQL + Edge Functions)
- Redis (Upstash) for caching
- Canvas API for card generation
- fast-check for property-based testing

## Tasks

- [x] 1. Database Schema Setup
  - Create all Phase 3 database tables with proper indexes
  - Implement Row Level Security (RLS) policies
  - Create database migration scripts with rollback capability
  - _Requirements: 7.1-7.17_

- [x] 2. Core Service Interfaces
  - [x] 2.1 Define TypeScript interfaces for all core services
    - FeatureDiscoveryEngine, PreferenceManager, BudgetTracker, StreakManager, CardGenerator, ReminderService, ComparisonEngine
    - _Requirements: All service interfaces from design_
  
  - [x] 2.2 Create base service classes with dependency injection
    - Setup service container for testability
    - _Requirements: Architecture design_

- [x] 3. Feature Discovery Engine
  - [x] 3.1 Implement feature discovery rule engine
    - Milestone-based triggers (day 3, 7, 14)
    - Context-based triggers (same meal 3x, late night logging)
    - Rate limiting (1 per day, 2-day spacing)
    - _Requirements: 0.1-0.15, 0A.1-0A.12_
  
  - [ ]* 3.2 Write property test for feature introduction rate limiting
    - **Property 1: Feature Introduction Rate Limiting**
    - **Validates: Requirements 0.7, 0A.10**
  
  - [ ]* 3.3 Write property test for feature discovery persistence
    - **Property 2: Feature Discovery Persistence**
    - **Validates: Requirements 0.9, 0.10, 0A.11**
  
  - [ ]* 3.4 Write unit tests for specific milestone triggers
    - Test day 3 reminder suggestion
    - Test day 7 budget suggestion
    - Test day 14 social feature mention
    - _Requirements: 0.3, 0.5, 0.6_

- [x] 4. Preference Manager
  - [x] 4.1 Implement NLP-based preference extraction
    - Extract dietary types from messages
    - Extract allergies from messages
    - Auto-detect favorites from frequency
    - _Requirements: 1.2, 1.3, 1.6_
  
  - [x] 4.2 Implement allergen checking system
    - Check food items against user allergies
    - Generate warning messages
    - _Requirements: 1.4_
  
  - [ ]* 4.3 Write property test for preference extraction
    - **Property 3: Preference Extraction Completeness**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ]* 4.4 Write property test for allergen warnings
    - **Property 4: Allergen Warning Consistency**
    - **Validates: Requirements 1.4**
  
  - [ ]* 4.5 Write property test for preference storage round-trip
    - **Property 16: Preference Storage Round-Trip**
    - **Validates: Requirements 1.8**

- [x] 5. Checkpoint - Core Infrastructure Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Streak Manager
  - [x] 6.1 Implement streak tracking logic
    - Daily streak increment
    - Streak freeze mechanism (1 per week)
    - Longest streak tracking
    - _Requirements: 3.1, 3.2_
  
  - [x] 6.2 Implement achievement system
    - Milestone achievements (3, 7, 14, 21, 30, 60, 90 days)
    - Quick win achievements (First Step, Strong Start, Comeback Kid)
    - Bonus achievements (Weekend Warrior, Full Day)
    - _Requirements: 3.3, 3.4, 3.5, 3A.1-3A.10_
  
  - [x] 6.3 Implement streak risk detection
    - Check for users about to lose streaks (20 hours)
    - Generate urgent reminders
    - _Requirements: 3.8_
  
  - [ ]* 6.4 Write property test for streak increment monotonicity
    - **Property 6: Streak Increment Monotonicity**
    - **Validates: Requirements 3.1**
  
  - [ ]* 6.5 Write property test for streak freeze availability
    - **Property 7: Streak Freeze Availability**
    - **Validates: Requirements 3.2**
  
  - [ ]* 6.6 Write property test for achievement award consistency
    - **Property 8: Achievement Award Consistency**
    - **Validates: Requirements 3.3**
  
  - [ ]* 6.7 Write property test for streak non-negativity invariant
    - **Property 13: Streak Non-Negativity**
    - **Validates: System integrity**
  
  - [ ]* 6.8 Write property test for transaction atomicity
    - **Property 19: Transaction Atomicity**
    - **Validates: Requirements 3.1, 3.3**
  
  - [ ]* 6.9 Write property test for concurrent update safety
    - **Property 22: Concurrent Update Safety**
    - **Validates: Requirements 3.1**

- [x] 7. Budget Tracker
  - [x] 7.1 Implement budget tracking logic
    - Daily budget setup and storage
    - Budget consumption tracking
    - Midnight reset (00:05 SGT)
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 7.2 Implement budget feedback system
    - Include remaining budget in responses
    - Warning at 80% threshold
    - Supportive message at 100%+
    - _Requirements: 2.5, 2.6, 2.7_
  
  - [ ]* 7.3 Write property test for budget feedback completeness
    - **Property 5: Budget Feedback Completeness**
    - **Validates: Requirements 2.5, 2.6**
  
  - [ ]* 7.4 Write property test for budget consistency
    - **Property 14: Budget Consistency**
    - **Validates: Requirements 2.8**
  
  - [ ]* 7.5 Write unit tests for budget edge cases
    - Test midnight rollover
    - Test budget disable/enable
    - Test negative budget handling
    - _Requirements: 2.3, 2.8, 2.9_

- [x] 8. Checkpoint - Gamification Core Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Comparison Engine
  - [ ] 9.1 Implement meal similarity detection
    - Fuzzy matching on food names
    - Calorie proximity scoring
    - Similarity threshold (>90%)
    - _Requirements: 6.1_
  
  - [ ] 9.2 Implement pattern detection
    - Time-based patterns (late night, consistent breakfast)
    - Frequency analysis (same meal 5+ times)
    - Week-over-week comparisons
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  
  - [ ] 9.3 Implement meal recall and stats
    - Historical meal lookup by date
    - Top foods by frequency
    - Eating pattern summaries
    - _Requirements: 6.8, 6.9_
  
  - [ ]* 9.4 Write property test for meal similarity detection
    - **Property 9: Meal Similarity Detection**
    - **Validates: Requirements 6.1**
  
  - [ ]* 9.5 Write unit tests for comparison scenarios
    - Test week-over-week comparison
    - Test pattern detection accuracy
    - Test meal recall
    - _Requirements: 6.2, 6.4, 6.8_

- [ ] 10. Card Generator
  - [ ] 10.1 Setup Canvas API for image generation
    - Install and configure canvas library
    - Create base card template
    - _Requirements: 4.4, 4.9_
  
  - [ ] 10.2 Implement daily card generation
    - Layout design (1080x1350px)
    - Data visualization (calories, meals, streak)
    - Bilingual text rendering
    - _Requirements: 4.2, 4.10, 4.11_
  
  - [ ] 10.3 Implement weekly card generation
    - 7-day trend visualization
    - Achievement highlights
    - Week-over-week comparison
    - _Requirements: 4.3_
  
  - [ ] 10.4 Implement achievement card generation
    - Badge rendering
    - Celebration message
    - User stats display
    - _Requirements: 3.12, 4.3_
  
  - [ ] 10.5 Implement card storage and delivery
    - Upload to Supabase storage
    - Generate WhatsApp-compatible URLs
    - Track card generation history
    - _Requirements: 4.6, 4.9_
  
  - [ ]* 10.6 Write property test for card generation idempotency
    - **Property 17: Card Generation Idempotency**
    - **Validates: Requirements 4.2, 4.3**
  
  - [ ]* 10.7 Write unit tests for card generation
    - Test daily card content
    - Test weekly card content
    - Test image size and format
    - _Requirements: 4.2, 4.3, 4.9_

- [ ] 11. Reminder Service
  - [ ] 11.1 Implement reminder scheduling system
    - User reminder preferences storage
    - Cron job setup (every 15 minutes)
    - Quiet hours handling
    - _Requirements: 5.3, 5.4, 5.8_
  
  - [ ] 11.2 Implement reminder delivery logic
    - Check if meal already logged
    - Skip if in quiet hours
    - Vary message templates
    - _Requirements: 5.4, 5.5, 5.9_
  
  - [ ] 11.3 Implement reminder effectiveness tracking
    - Track response rate (logged within 2 hours)
    - Auto-adjust frequency if low effectiveness
    - _Requirements: 5.7_
  
  - [ ] 11.4 Implement streak protection reminders
    - Detect users about to lose streaks
    - Send urgent reminders
    - _Requirements: 5.10_
  
  - [ ]* 11.5 Write property test for reminder frequency limit
    - **Property 12: Reminder Frequency Limit**
    - **Validates: Requirements 5.4, 5.5, 5.12**
  
  - [ ]* 11.6 Write unit tests for reminder scenarios
    - Test quiet hours
    - Test skip if already logged
    - Test effectiveness tracking
    - _Requirements: 5.5, 5.7, 5.8_

- [ ] 12. Checkpoint - All Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration with Existing Meal Logging Flow
  - [x] 13.1 Enhance webhook handler to call Phase 3 services
    - Call FeatureDiscoveryEngine after meal log
    - Call StreakManager to update streak
    - Call BudgetTracker if enabled
    - Call ComparisonEngine for similar meals
    - _Requirements: 0.1-0.15, 3.1, 2.5, 6.1_
  
  - [x] 13.2 Enhance response formatter
    - Combine all Phase 3 data into single message
    - Maintain simplicity (max 3 info points)
    - Support bilingual formatting
    - _Requirements: 9.1, 9.6, 9.9_
  
  - [ ]* 13.3 Write property test for core experience simplicity
    - **Property 11: Core Experience Simplicity**
    - **Validates: Requirements 9.1**
  
  - [ ]* 13.4 Write integration tests for meal logging flow
    - Test new user first meal
    - Test user with active features
    - Test feature discovery triggers
    - _Requirements: 0.1, 0.2, 0.3_

- [x] 14. Command Handlers
  - [x] 14.1 Implement "help" command
    - Show 5 most useful commands
    - Simple format, no overwhelming lists
    - _Requirements: 9.4_
  
  - [x] 14.2 Implement "streak" / "stats" command
    - Show current streak, longest streak
    - Show achievements earned
    - Show total meals logged
    - _Requirements: 3.6_
  
  - [x] 14.3 Implement "budget" command
    - Enable/disable budget tracking
    - Set budget target
    - Show budget status
    - _Requirements: 2.2, 2.7, 2.8_
  
  - [x] 14.4 Implement "card" command
    - Ask for card type (daily, weekly, achievement)
    - Generate and send card
    - _Requirements: 4.1, 4.6_
  
  - [x] 14.5 Implement "reminders" command
    - Enable/disable reminders
    - Set reminder times
    - _Requirements: 5.2, 5.3, 5.6_
  
  - [x] 14.6 Implement "compare" / "progress" command
    - Show week-over-week comparison
    - Show eating patterns
    - _Requirements: 6.2, 6.4_
  
  - [x] 14.7 Implement "preferences" / "settings" command
    - Show learned preferences
    - Allow manual edits
    - _Requirements: 1.5_
  
  - [ ]* 14.8 Write unit tests for all commands
    - Test command parsing
    - Test response formatting
    - Test error handling
    - _Requirements: 9.2, 9.4_

- [ ] 15. Social Features (Optional)
  - [ ] 15.1 Implement social feature opt-in system
    - "social" command to enable
    - Store opt-in status
    - _Requirements: 6A.1, 6A.2_
  
  - [ ] 15.2 Implement referral system
    - Generate referral links
    - Track referrals
    - Award bonus achievements
    - _Requirements: 6A.6, 6A.7_
  
  - [ ] 15.3 Implement community challenges
    - Weekly challenge creation
    - User participation tracking
    - Leaderboard generation
    - _Requirements: 6A.4, 6A.5_
  
  - [ ] 15.4 Implement accountability partner feature
    - Connection requests
    - Daily status sharing
    - Friendly nudges
    - _Requirements: 6A.8, 6A.9_
  
  - [ ]* 15.5 Write property test for social feature isolation
    - **Property 23: Social Feature Isolation**
    - **Validates: Requirements 6A.1, 6A.13**
  
  - [ ]* 15.6 Write property test for referral reward symmetry
    - **Property 24: Referral Reward Symmetry**
    - **Validates: Requirements 6A.6**

- [ ] 16. Background Jobs
  - [ ] 16.1 Implement daily reset job (midnight SGT)
    - Reset daily budgets
    - Check and reset streaks
    - Reset streak freezes (Monday)
    - _Requirements: 2.3, 3.2_
  
  - [ ] 16.2 Implement reminder dispatch job (every 15 min)
    - Query users with active reminders
    - Send reminders via WhatsApp API
    - Track delivery status
    - _Requirements: 5.4_
  
  - [ ] 16.3 Implement re-engagement job (daily)
    - Find users inactive 7+ days
    - Send "we miss you" message (once)
    - _Requirements: 5.11_
  
  - [ ]* 16.4 Write unit tests for background jobs
    - Test midnight reset logic
    - Test reminder batch processing
    - Test re-engagement targeting
    - _Requirements: 2.3, 5.4, 5.11_

- [ ] 17. Checkpoint - All Features Implemented
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Performance Optimization
  - [ ] 18.1 Implement Redis caching
    - Cache user preferences (1 hour TTL)
    - Cache streak data (5 min TTL)
    - Cache budget data (until midnight)
    - _Requirements: 10.4_
  
  - [ ] 18.2 Optimize database queries
    - Add missing indexes
    - Use connection pooling
    - Implement query result caching
    - _Requirements: 10.6, 10.7_
  
  - [ ] 18.3 Implement rate limiting
    - Card generation: 10 per user per day
    - WhatsApp messages: respect API limits
    - _Requirements: 10.8_
  
  - [ ]* 18.4 Write property tests for performance bounds
    - **Property 25: Response Time Bounds**
    - **Property 26: Reminder Batch Processing**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

- [ ] 19. Error Handling and Monitoring
  - [ ] 19.1 Implement graceful degradation
    - Handle WhatsApp API failures
    - Handle image generation failures
    - Handle database timeouts
    - _Requirements: Error handling strategy_
  
  - [ ] 19.2 Implement error logging and alerting
    - Setup Sentry for error tracking
    - Define critical vs. warning errors
    - Setup alert thresholds
    - _Requirements: Error monitoring_
  
  - [ ]* 19.3 Write property test for graceful degradation
    - **Property 18: Graceful Degradation**
    - **Validates: Error handling strategy**
  
  - [ ]* 19.4 Write unit tests for error scenarios
    - Test external service failures
    - Test data consistency errors
    - Test user input errors
    - _Requirements: Error handling categories_

- [ ] 20. Privacy and Security
  - [ ] 20.1 Implement data encryption
    - Encrypt sensitive preference data (AES-256)
    - Encrypt allergy information
    - _Requirements: 8.1, 8.8_
  
  - [ ] 20.2 Implement data export
    - Generate JSON export of all user data
    - Deliver within 48 hours
    - _Requirements: 8.4_
  
  - [ ] 20.3 Implement data deletion
    - Cascade delete all user data
    - Preserve anonymized stats
    - Complete within 7 days
    - _Requirements: 8.5, 8.6_
  
  - [ ]* 20.4 Write property test for data encryption
    - **Property 10: Data Encryption at Rest**
    - **Validates: Requirements 8.1**
  
  - [ ]* 20.5 Write unit tests for privacy features
    - Test data export completeness
    - Test data deletion cascade
    - Test anonymization
    - _Requirements: 8.4, 8.5_

- [ ] 21. Final Integration Testing
  - [ ]* 21.1 Write end-to-end tests for complete user journeys
    - New user onboarding (first meal → day 3 → day 7)
    - Feature discovery flow
    - Budget tracking flow
    - Streak protection flow
    - Card generation flow
    - _Requirements: All requirements_
  
  - [ ]* 21.2 Write property test for edge cases
    - **Property 20: Midnight Rollover Correctness**
    - **Property 21: Empty State Handling**
    - **Validates: Timezone handling, empty states**
  
  - [ ]* 21.3 Write load tests
    - 1000 concurrent meal logs
    - 10,000 reminders in 10 minutes
    - 100 card generations simultaneously
    - _Requirements: 10.1-10.10_

- [ ] 22. Final Checkpoint - Production Ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- All code should be written in TypeScript following existing project conventions
- Use existing Supabase client and WhatsApp integration patterns
- Maintain backward compatibility with Phase 1 and Phase 2 features

## Estimated Timeline

- Database & Core Infrastructure (Tasks 1-5): 3-4 days
- Gamification Features (Tasks 6-8): 4-5 days
- Comparison & Cards (Tasks 9-10): 3-4 days
- Reminders & Integration (Tasks 11-14): 4-5 days
- Social Features (Task 15): 2-3 days (optional)
- Background Jobs & Optimization (Tasks 16-18): 3-4 days
- Error Handling & Security (Tasks 19-20): 2-3 days
- Final Testing (Tasks 21-22): 2-3 days

**Total**: 23-31 days (without social features: 21-28 days)
