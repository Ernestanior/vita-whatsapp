import { describe, it, expect } from '@jest/globals';
import {
  buildFoodRecognitionPrompt,
  buildUserPrompt,
  detectMealContext,
} from '../prompts';

describe('Prompts', () => {
  describe('buildFoodRecognitionPrompt', () => {
    it('should build English prompt', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'en' });

      expect(prompt).toContain('Singapore food recognition expert');
      expect(prompt).toContain('Chicken Rice');
      expect(prompt).toContain('Laksa');
      expect(prompt).toContain('RESPONSE FORMAT (JSON)');
      expect(prompt).toContain('LANGUAGE REQUIREMENTS');
    });

    it('should build Chinese (Simplified) prompt', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'zh-CN' });

      expect(prompt).toContain('Singapore food recognition expert');
      expect(prompt).toContain('简体中文');
      expect(prompt).toContain('语言要求');
    });

    it('should build Chinese (Traditional) prompt', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'zh-TW' });

      expect(prompt).toContain('Singapore food recognition expert');
      expect(prompt).toContain('繁體中文');
      expect(prompt).toContain('語言要求');
    });

    it('should include Singapore food database', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'en' });

      expect(prompt).toContain('Chicken Rice (海南鸡饭)');
      expect(prompt).toContain('Laksa (叻沙)');
      expect(prompt).toContain('Bak Chor Mee (肉脞面)');
      expect(prompt).toContain('Nasi Lemak (椰浆饭)');
      expect(prompt).toContain('Char Kway Teow (炒粿条)');
    });

    it('should include nutrition estimation rules', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'en' });

      expect(prompt).toContain('NUTRITION ESTIMATION RULES');
      expect(prompt).toContain('Provide ranges (min-max)');
      expect(prompt).toContain('hidden calories');
      expect(prompt).toContain('Be conservative');
    });

    it('should include confidence scoring guidelines', () => {
      const prompt = buildFoodRecognitionPrompt({ language: 'en' });

      expect(prompt).toContain('CONFIDENCE SCORING');
      expect(prompt).toContain('90-100');
      expect(prompt).toContain('70-89');
      expect(prompt).toContain('60-69');
      expect(prompt).toContain('Below 60');
    });
  });

  describe('buildUserPrompt', () => {
    it('should build English user prompt', () => {
      const prompt = buildUserPrompt('en');

      expect(prompt).toContain('identify the food');
      expect(prompt).toContain('nutrition information');
      expect(prompt).toContain('JSON format');
    });

    it('should build Chinese (Simplified) user prompt', () => {
      const prompt = buildUserPrompt('zh-CN');

      expect(prompt).toContain('识别');
      expect(prompt).toContain('食物');
      expect(prompt).toContain('营养信息');
    });

    it('should build Chinese (Traditional) user prompt', () => {
      const prompt = buildUserPrompt('zh-TW');

      expect(prompt).toContain('識別');
      expect(prompt).toContain('食物');
      expect(prompt).toContain('營養信息');
    });
  });

  describe('detectMealContext', () => {
    it('should detect breakfast (6:00-9:59)', () => {
      const morning6 = new Date('2024-01-01T06:00:00');
      const morning9 = new Date('2024-01-01T09:59:00');

      expect(detectMealContext(morning6)).toBe('breakfast');
      expect(detectMealContext(morning9)).toBe('breakfast');
    });

    it('should detect lunch (11:00-13:59)', () => {
      const lunch11 = new Date('2024-01-01T11:00:00');
      const lunch13 = new Date('2024-01-01T13:59:00');

      expect(detectMealContext(lunch11)).toBe('lunch');
      expect(detectMealContext(lunch13)).toBe('lunch');
    });

    it('should detect dinner (17:00-20:59)', () => {
      const dinner17 = new Date('2024-01-01T17:00:00');
      const dinner20 = new Date('2024-01-01T20:59:00');

      expect(detectMealContext(dinner17)).toBe('dinner');
      expect(detectMealContext(dinner20)).toBe('dinner');
    });

    it('should detect snack for other times', () => {
      const night23 = new Date('2024-01-01T23:00:00');
      const early5 = new Date('2024-01-01T05:00:00');
      const afternoon15 = new Date('2024-01-01T15:00:00');

      expect(detectMealContext(night23)).toBe('snack');
      expect(detectMealContext(early5)).toBe('snack');
      expect(detectMealContext(afternoon15)).toBe('snack');
    });

    it('should use current time if no time provided', () => {
      const context = detectMealContext();
      expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(context);
    });
  });
});
