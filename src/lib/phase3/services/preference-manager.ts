/**
 * Phase 3: Preference Manager
 * Passively learns and stores user preferences
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import type {
  PreferenceManager,
  UserPreferences,
  ExtractedPreferences,
  AllergenWarning,
  Allergy,
} from '../types';

export class PreferenceService implements PreferenceManager {
  constructor(private supabase: SupabaseClient<Database>) {
    logger.debug('PreferenceService initialized');
  }

  /**
   * Extract and store preferences from natural language
   */
  async extractFromMessage(
    userId: string,
    message: string
  ): Promise<ExtractedPreferences> {
    try {
      logger.debug({ userId }, 'Extracting preferences from message');

      const extracted: ExtractedPreferences = {};
      const lowerMessage = message.toLowerCase();

      // Extract dietary types using pattern matching
      const dietaryPatterns = {
        vegetarian: /(vegetarian|veg\b|素食|吃素)/i,
        vegan: /(vegan|纯素)/i,
        halal: /(halal|清真)/i,
        keto: /(keto|ketogenic|生酮)/i,
        paleo: /(paleo|原始人)/i,
        'gluten-free': /(gluten[- ]free|无麸质)/i,
        'dairy-free': /(dairy[- ]free|无乳制品)/i,
        pescatarian: /(pescatarian|鱼素)/i,
      };

      const detectedDietary: string[] = [];
      for (const [type, pattern] of Object.entries(dietaryPatterns)) {
        if (pattern.test(lowerMessage)) {
          detectedDietary.push(type);
        }
      }

      if (detectedDietary.length > 0) {
        extracted.dietaryType = detectedDietary;
      }

      // Extract allergies using pattern matching
      const allergyPatterns = {
        peanuts: { pattern: /(peanut|花生|groundnut)/i, severity: 'severe' as const },
        'tree nuts': { pattern: /(tree nut|almond|walnut|cashew|坚果)/i, severity: 'severe' as const },
        shellfish: { pattern: /(shellfish|shrimp|crab|lobster|虾|蟹|贝类)/i, severity: 'severe' as const },
        fish: { pattern: /(fish allerg|鱼过敏)/i, severity: 'moderate' as const },
        milk: { pattern: /(milk|dairy|lactose|乳制品|牛奶)/i, severity: 'moderate' as const },
        eggs: { pattern: /(egg|鸡蛋)/i, severity: 'moderate' as const },
        soy: { pattern: /(soy|soya|大豆)/i, severity: 'mild' as const },
        wheat: { pattern: /(wheat|gluten|小麦|麸质)/i, severity: 'moderate' as const },
        sesame: { pattern: /(sesame|芝麻)/i, severity: 'moderate' as const },
      };

      // Check if message mentions allergies
      const allergyMentioned = /(allerg|allergic|敏感|过敏|不能吃|can't eat|cannot eat)/i.test(message);

      if (allergyMentioned) {
        const detectedAllergies: Allergy[] = [];
        for (const [allergen, { pattern, severity }] of Object.entries(allergyPatterns)) {
          if (pattern.test(message)) {
            detectedAllergies.push({
              allergen,
              severity,
              detectedFrom: 'user_mention',
            });
          }
        }

        if (detectedAllergies.length > 0) {
          extracted.allergies = detectedAllergies;
        }
      }

      // Store extracted preferences in database
      if (extracted.dietaryType || extracted.allergies) {
        await this.storeExtractedPreferences(userId, extracted);
      }

      return extracted;
    } catch (error) {
      logger.error({ error, userId }, 'Error extracting preferences');
      return {};
    }
  }

  /**
   * Store extracted preferences in database
   */
  private async storeExtractedPreferences(
    userId: string,
    extracted: ExtractedPreferences
  ): Promise<void> {
    try {
      // Get existing preferences
      const { data: existing } = await this.supabase
        .from('user_preferences')
        .select('dietary_type, allergies')
        .eq('user_id', userId)
        .single();

      const updates: any = {};

      // Merge dietary types
      if (extracted.dietaryType) {
        const existingDietary = ((existing as any)?.dietary_type as string[]) || [];
        const merged = [...new Set([...existingDietary, ...extracted.dietaryType])];
        updates.dietary_type = merged;
      }

      // Merge allergies
      if (extracted.allergies) {
        const existingAllergies = ((existing as any)?.allergies as Allergy[]) || [];
        const existingAllergenNames = existingAllergies.map((a: Allergy) => a.allergen);
        
        // Add new allergies that don't exist
        const newAllergies = extracted.allergies.filter(
          (a) => !existingAllergenNames.includes(a.allergen)
        );
        
        if (newAllergies.length > 0) {
          updates.allergies = [...existingAllergies, ...newAllergies];
        }
      }

      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await this.supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            ...updates,
          });

        if (error) {
          logger.error({ error, userId }, 'Error storing preferences');
        } else {
          logger.info({ userId, updates }, 'Preferences stored');
        }
      }
    } catch (error) {
      logger.error({ error, userId }, 'Error storing extracted preferences');
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      logger.debug({ userId }, 'Getting user preferences');

      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        logger.error({ error, userId }, 'Error getting preferences');
      }

      // Return with defaults if not found
      if (!data) {
        return {
          dietaryType: [],
          allergies: [],
          favorites: [],
          eatingHabits: {},
          minimalMode: false,
        };
      }

      // Auto-detect favorites from frequency (5+ logs)
      const favorites = await this.detectFavorites(userId);

      const dataAny = data as any;

      return {
        dietaryType: (dataAny.dietary_type as string[]) || [],
        allergies: (dataAny.allergies as Allergy[]) || [],
        favorites,
        eatingHabits: dataAny.eating_habits || {},
        minimalMode: dataAny.minimal_mode || false,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error getting preferences');
      throw error;
    }
  }

  /**
   * Auto-detect favorite foods from frequency (5+ logs)
   */
  private async detectFavorites(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('food_name, frequency')
        .eq('user_id', userId)
        .gte('frequency', 5)
        .order('frequency', { ascending: false })
        .limit(10);

      if (error) {
        logger.error({ error, userId }, 'Error detecting favorites');
        return [];
      }

      return (data || []).map((item: any) => item.food_name);
    } catch (error) {
      logger.error({ error, userId }, 'Error detecting favorites');
      return [];
    }
  }

  /**
   * Update specific preference
   */
  async updatePreference(userId: string, key: string, value: any): Promise<void> {
    try {
      logger.debug({ userId, key }, 'Updating preference');

      const updates: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      // Map key to database column
      switch (key) {
        case 'dietaryType':
          updates.dietary_type = value;
          break;
        case 'allergies':
          updates.allergies = value;
          break;
        case 'eatingHabits':
          updates.eating_habits = value;
          break;
        case 'minimalMode':
          updates.minimal_mode = value;
          break;
        case 'languagePreference':
          updates.language_preference = value;
          break;
        default:
          logger.warn({ key, userId }, 'Unknown preference key');
          return;
      }

      const { error } = await this.supabase
        .from('user_preferences')
        .upsert(updates);

      if (error) {
        logger.error({ error, userId, key }, 'Error updating preference');
        throw error;
      }

      logger.info({ userId, key }, 'Preference updated');
    } catch (error) {
      logger.error({ error, userId, key }, 'Error updating preference');
      throw error;
    }
  }

  /**
   * Check if food contains user allergens
   */
  async checkAllergens(
    userId: string,
    foodItems: string[]
  ): Promise<AllergenWarning[]> {
    try {
      logger.debug({ userId, foodItems }, 'Checking allergens');

      // Get user allergies
      const preferences = await this.getPreferences(userId);
      
      if (!preferences.allergies || preferences.allergies.length === 0) {
        return [];
      }

      const warnings: AllergenWarning[] = [];

      // Check each food item against user allergies
      for (const food of foodItems) {
        const lowerFood = food.toLowerCase();

        for (const allergy of preferences.allergies) {
          const allergen = allergy.allergen.toLowerCase();
          
          // Check if food contains allergen
          if (this.containsAllergen(lowerFood, allergen)) {
            warnings.push({
              allergen: allergy.allergen,
              severity: allergy.severity,
              message: this.generateWarningMessage(food, allergy),
            });
          }
        }
      }

      return warnings;
    } catch (error) {
      logger.error({ error, userId }, 'Error checking allergens');
      return [];
    }
  }

  /**
   * Check if food contains allergen using pattern matching
   */
  private containsAllergen(food: string, allergen: string): boolean {
    // Direct match
    if (food.includes(allergen)) {
      return true;
    }

    // Allergen-specific patterns
    const allergenPatterns: Record<string, RegExp[]> = {
      peanuts: [/peanut/i, /花生/i, /groundnut/i],
      'tree nuts': [/almond/i, /walnut/i, /cashew/i, /pistachio/i, /hazelnut/i, /pecan/i, /坚果/i],
      shellfish: [/shrimp/i, /prawn/i, /crab/i, /lobster/i, /虾/i, /蟹/i, /贝类/i, /oyster/i, /clam/i],
      fish: [/fish/i, /salmon/i, /tuna/i, /cod/i, /鱼/i],
      milk: [/milk/i, /dairy/i, /cheese/i, /butter/i, /cream/i, /yogurt/i, /牛奶/i, /乳制品/i],
      eggs: [/egg/i, /鸡蛋/i, /蛋/i],
      soy: [/soy/i, /tofu/i, /豆腐/i, /大豆/i, /edamame/i],
      wheat: [/wheat/i, /bread/i, /pasta/i, /noodle/i, /小麦/i, /面/i],
      sesame: [/sesame/i, /芝麻/i],
    };

    const patterns = allergenPatterns[allergen] || [];
    return patterns.some((pattern) => pattern.test(food));
  }

  /**
   * Generate warning message based on severity
   */
  private generateWarningMessage(food: string, allergy: Allergy): string {
    const severityEmojis = {
      severe: '🚨',
      moderate: '⚠️',
      mild: '⚡',
    };

    const emoji = severityEmojis[allergy.severity];

    switch (allergy.severity) {
      case 'severe':
        return `${emoji} SEVERE ALLERGY WARNING: ${food} may contain ${allergy.allergen}! Please avoid.`;
      case 'moderate':
        return `${emoji} Allergy Alert: ${food} may contain ${allergy.allergen}. Please check ingredients.`;
      case 'mild':
        return `${emoji} Note: ${food} may contain ${allergy.allergen}. You mentioned sensitivity to this.`;
      default:
        return `⚠️ ${food} may contain ${allergy.allergen}.`;
    }
  }
}
