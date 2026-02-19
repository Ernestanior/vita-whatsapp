/**
 * Tests for PreferenceService
 * Tasks 4.1 and 4.2: NLP-based preference extraction and allergen checking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PreferenceService } from '../preference-manager';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

describe('PreferenceService', () => {
  let service: PreferenceService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      })),
    };

    service = new PreferenceService(mockSupabase as unknown as SupabaseClient<Database>);
  });

  describe('Task 4.1: NLP-based preference extraction', () => {
    it('should extract vegetarian dietary type', async () => {
      const result = await service.extractFromMessage('user123', "I'm vegetarian");
      
      expect(result.dietaryType).toContain('vegetarian');
    });

    it('should extract halal dietary type', async () => {
      const result = await service.extractFromMessage('user123', 'I only eat halal food');
      
      expect(result.dietaryType).toContain('halal');
    });

    it('should extract keto dietary type', async () => {
      const result = await service.extractFromMessage('user123', "I'm on a keto diet");
      
      expect(result.dietaryType).toContain('keto');
    });

    it('should extract peanut allergy', async () => {
      const result = await service.extractFromMessage('user123', "I'm allergic to peanuts");
      
      expect(result.allergies).toBeDefined();
      expect(result.allergies?.length).toBeGreaterThan(0);
      expect(result.allergies?.[0].allergen).toBe('peanuts');
      expect(result.allergies?.[0].severity).toBe('severe');
    });

    it('should extract shellfish allergy', async () => {
      const result = await service.extractFromMessage('user123', 'I cannot eat shellfish');
      
      expect(result.allergies).toBeDefined();
      expect(result.allergies?.some(a => a.allergen === 'shellfish')).toBe(true);
    });

    it('should extract multiple dietary types', async () => {
      const result = await service.extractFromMessage('user123', "I'm vegetarian and gluten-free");
      
      expect(result.dietaryType).toContain('vegetarian');
      expect(result.dietaryType).toContain('gluten-free');
    });

    it('should not extract allergies without allergy keywords', async () => {
      const result = await service.extractFromMessage('user123', 'I love peanuts');
      
      expect(result.allergies).toBeUndefined();
    });

    it('should handle Chinese text for dietary types', async () => {
      const result = await service.extractFromMessage('user123', '我吃素');
      
      expect(result.dietaryType).toContain('vegetarian');
    });
  });

  describe('Task 4.2: Allergen checking system', () => {
    beforeEach(() => {
      // Mock getPreferences to return allergies
      vi.spyOn(service, 'getPreferences').mockResolvedValue({
        dietaryType: [],
        allergies: [
          { allergen: 'peanuts', severity: 'severe', detectedFrom: 'user_mention' },
          { allergen: 'shellfish', severity: 'severe', detectedFrom: 'user_mention' },
        ],
        favorites: [],
        eatingHabits: {},
        minimalMode: false,
      });
    });

    it('should detect peanut allergen in food', async () => {
      const warnings = await service.checkAllergens('user123', ['peanut butter sandwich']);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].allergen).toBe('peanuts');
      expect(warnings[0].severity).toBe('severe');
      expect(warnings[0].message).toContain('SEVERE ALLERGY WARNING');
    });

    it('should detect shellfish allergen', async () => {
      const warnings = await service.checkAllergens('user123', ['shrimp fried rice']);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].allergen).toBe('shellfish');
    });

    it('should return empty array for safe foods', async () => {
      const warnings = await service.checkAllergens('user123', ['chicken rice', 'vegetables']);
      
      expect(warnings.length).toBe(0);
    });

    it('should generate appropriate warning messages by severity', async () => {
      vi.spyOn(service, 'getPreferences').mockResolvedValue({
        dietaryType: [],
        allergies: [
          { allergen: 'milk', severity: 'moderate', detectedFrom: 'user_mention' },
        ],
        favorites: [],
        eatingHabits: {},
        minimalMode: false,
      });

      const warnings = await service.checkAllergens('user123', ['cheese pizza']);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain('Allergy Alert');
      expect(warnings[0].message).not.toContain('SEVERE');
    });

    it('should handle multiple allergens in one food', async () => {
      vi.spyOn(service, 'getPreferences').mockResolvedValue({
        dietaryType: [],
        allergies: [
          { allergen: 'peanuts', severity: 'severe', detectedFrom: 'user_mention' },
          { allergen: 'soy', severity: 'mild', detectedFrom: 'user_mention' },
        ],
        favorites: [],
        eatingHabits: {},
        minimalMode: false,
      });

      const warnings = await service.checkAllergens('user123', ['peanut tofu stir fry']);
      
      expect(warnings.length).toBeGreaterThan(0);
      // Should detect both peanuts and soy (tofu)
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences when no data exists', async () => {
      const prefs = await service.getPreferences('user123');
      
      expect(prefs.dietaryType).toEqual([]);
      expect(prefs.allergies).toEqual([]);
      expect(prefs.favorites).toEqual([]);
      expect(prefs.minimalMode).toBe(false);
    });
  });

  describe('updatePreference', () => {
    it('should update dietary type preference', async () => {
      await service.updatePreference('user123', 'dietaryType', ['vegetarian']);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });

    it('should update minimal mode preference', async () => {
      await service.updatePreference('user123', 'minimalMode', true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });
  });
});
