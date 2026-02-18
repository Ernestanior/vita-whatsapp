/**
 * Language Detector
 * Detects language from text and updates user preference
 */

import { logger } from '@/utils/logger';
import { createClient } from '@/lib/supabase/server';

export type SupportedLanguage = 'en' | 'zh-CN' | 'zh-TW';

export class LanguageDetector {
  /**
   * Detect language from text
   * Returns 'en' by default, unless Chinese characters are detected
   */
  detectLanguage(text: string): SupportedLanguage {
    // Check for Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    
    if (!hasChinese) {
      return 'en'; // Default to English
    }

    // Check for Traditional Chinese indicators
    const traditionalIndicators = ['繁體', '繁体', '台灣', '台湾', '臺灣', '臺湾'];
    const hasTraditionalIndicator = traditionalIndicators.some(indicator => 
      text.includes(indicator)
    );

    if (hasTraditionalIndicator) {
      return 'zh-TW';
    }

    // Check for common Traditional Chinese characters
    const traditionalChars = ['個', '們', '這', '那', '來', '為', '與', '說', '話', '時', '間', '會', '過', '還', '沒', '見', '現', '點', '開', '關'];
    const traditionalCount = traditionalChars.filter(char => text.includes(char)).length;

    // Check for common Simplified Chinese characters
    const simplifiedChars = ['个', '们', '这', '那', '来', '为', '与', '说', '话', '时', '间', '会', '过', '还', '没', '见', '现', '点', '开', '关'];
    const simplifiedCount = simplifiedChars.filter(char => text.includes(char)).length;

    // If more traditional characters, use Traditional Chinese
    if (traditionalCount > simplifiedCount) {
      return 'zh-TW';
    }

    // Default to Simplified Chinese if Chinese detected
    return 'zh-CN';
  }

  /**
   * Get user's preferred language from database
   * Returns 'en' as default if user not found
   */
  async getUserLanguage(userId: string): Promise<SupportedLanguage> {
    try {
      const supabase = await createClient();
      
      const { data: user } = await supabase
        .from('users')
        .select('language')
        .eq('phone_number', userId)
        .maybeSingle();

      if (!user) {
        return 'en'; // Default to English
      }

      // Type assertion for the language field
      const userData = user as { language?: string | null };
      const language = userData.language;
      
      if (!language) {
        return 'en';
      }

      return language as SupportedLanguage;
    } catch (error) {
      logger.error({
        type: 'get_user_language_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'en'; // Fail safe to English
    }
  }

  /**
   * Update user's language preference in database
   */
  async updateUserLanguage(userId: string, language: SupportedLanguage): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Upsert user with new language
      const { error } = await supabase
        .from('users')
        .upsert({
          phone_number: userId,
          language: language as string,
        } as any, {
          onConflict: 'phone_number',
        });

      if (error) {
        logger.error({
          type: 'update_user_language_error',
          userId,
          language,
          error: error.message,
        });
      } else {
        logger.info({
          type: 'user_language_updated',
          userId,
          language,
        });
      }
    } catch (error) {
      logger.error({
        type: 'update_user_language_exception',
        userId,
        language,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Detect and update user language from text message
   * Returns the detected language
   */
  async detectAndUpdate(userId: string, text: string): Promise<SupportedLanguage> {
    // Get current user language
    const currentLanguage = await this.getUserLanguage(userId);
    
    // Detect language from text
    const detectedLanguage = this.detectLanguage(text);
    
    // If detected language is different from current, update it
    if (detectedLanguage !== currentLanguage) {
      logger.info({
        type: 'language_change_detected',
        userId,
        from: currentLanguage,
        to: detectedLanguage,
      });
      
      // Update in background (fire-and-forget)
      this.updateUserLanguage(userId, detectedLanguage).catch(error => {
        logger.error({
          type: 'language_update_background_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }
    
    return detectedLanguage;
  }
}

// Singleton instance
export const languageDetector = new LanguageDetector();
