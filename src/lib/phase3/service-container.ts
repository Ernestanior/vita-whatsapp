/**
 * Phase 3: Service Container
 * Dependency injection container for all Phase 3 services
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import { FeatureDiscoveryService } from './services/feature-discovery-engine';
import { PreferenceService } from './services/preference-manager';
import { BudgetService } from './services/budget-tracker';
import { StreakService } from './services/streak-manager-fixed';
import { CardService } from './services/card-generator';
import { ReminderServiceImpl } from './services/reminder-service';
import { ComparisonService } from './services/comparison-engine';

/**
 * Service Container
 * Manages lifecycle and dependencies of all Phase 3 services
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;
  
  private featureDiscovery: FeatureDiscoveryService | null = null;
  private preferenceManager: PreferenceService | null = null;
  private budgetTracker: BudgetService | null = null;
  private streakManager: StreakService | null = null;
  private cardGenerator: CardService | null = null;
  private reminderService: ReminderServiceImpl | null = null;
  private comparisonEngine: ComparisonService | null = null;

  private constructor(private supabase: SupabaseClient<Database>) {
    logger.info('ServiceContainer initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(supabase: SupabaseClient<Database>): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(supabase);
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    ServiceContainer.instance = null;
  }

  /**
   * Get Feature Discovery Engine
   */
  getFeatureDiscovery(): FeatureDiscoveryService {
    if (!this.featureDiscovery) {
      this.featureDiscovery = new FeatureDiscoveryService(this.supabase);
    }
    return this.featureDiscovery;
  }

  /**
   * Get Preference Manager
   */
  getPreferenceManager(): PreferenceService {
    if (!this.preferenceManager) {
      this.preferenceManager = new PreferenceService(this.supabase);
    }
    return this.preferenceManager;
  }

  /**
   * Get Budget Tracker
   */
  getBudgetTracker(): BudgetService {
    if (!this.budgetTracker) {
      this.budgetTracker = new BudgetService(this.supabase);
    }
    return this.budgetTracker;
  }

  /**
   * Get Streak Manager
   */
  getStreakManager(): StreakService {
    if (!this.streakManager) {
      this.streakManager = new StreakService(this.supabase);
    }
    return this.streakManager;
  }

  /**
   * Get Card Generator
   */
  getCardGenerator(): CardService {
    if (!this.cardGenerator) {
      this.cardGenerator = new CardService(this.supabase);
    }
    return this.cardGenerator;
  }

  /**
   * Get Reminder Service
   */
  getReminderService(): ReminderServiceImpl {
    if (!this.reminderService) {
      this.reminderService = new ReminderServiceImpl(this.supabase);
    }
    return this.reminderService;
  }

  /**
   * Get Comparison Engine
   */
  getComparisonEngine(): ComparisonService {
    if (!this.comparisonEngine) {
      this.comparisonEngine = new ComparisonService(this.supabase);
    }
    return this.comparisonEngine;
  }
}
