/**
 * i18n utility functions
 * Requirements: 15.1, 15.2, 15.3
 */

import { Language, translations, Translations } from './translations';

/**
 * Get translation function for a specific language
 */
export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en;
}

/**
 * Detect language from user input or browser
 */
export function detectLanguage(userInput?: string): Language {
  if (userInput) {
    const lower = userInput.toLowerCase();
    if (lower.includes('中文') || lower.includes('chinese')) {
      return 'zh-CN';
    }
    if (lower.includes('繁體') || lower.includes('traditional')) {
      return 'zh-TW';
    }
  }

  // Browser detection
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
      return 'zh-TW';
    }
    if (browserLang.startsWith('zh')) {
      return 'zh-CN';
    }
  }

  return 'en';
}

/**
 * Format currency for Singapore
 */
export function formatCurrency(amount: number, language: Language): string {
  const formatter = new Intl.NumberFormat(language === 'en' ? 'en-SG' : 'zh-SG', {
    style: 'currency',
    currency: 'SGD',
  });
  return formatter.format(amount);
}

/**
 * Format date for Singapore
 */
export function formatDate(date: Date, language: Language): string {
  const locale = language === 'en' ? 'en-SG' : language === 'zh-CN' ? 'zh-CN' : 'zh-TW';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format time for Singapore
 */
export function formatTime(date: Date, language: Language): string {
  const locale = language === 'en' ? 'en-SG' : language === 'zh-CN' ? 'zh-CN' : 'zh-TW';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export { Language, Translations };
export * from './translations';
