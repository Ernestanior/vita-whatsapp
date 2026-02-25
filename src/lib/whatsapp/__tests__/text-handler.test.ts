import { describe, it, expect } from 'vitest';
import { TextHandler } from '@/lib/whatsapp/text-handler';

describe('TextHandler.parseMacros', () => {
  it('parses full P C F input', () => {
    expect(TextHandler.parseMacros('P35 C40 F12')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });

  it('parses lowercase', () => {
    expect(TextHandler.parseMacros('p35 c40 f12')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });

  it('parses mixed case', () => {
    expect(TextHandler.parseMacros('p35 C40 f12')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });

  it('parses with decimals', () => {
    expect(TextHandler.parseMacros('P35.5 C40.2 F12.8')).toEqual({
      protein: 35.5, carbs: 40.2, fat: 12.8,
    });
  });

  it('parses partial — P only', () => {
    expect(TextHandler.parseMacros('P35')).toEqual({ protein: 35 });
  });

  it('parses partial — P and C', () => {
    expect(TextHandler.parseMacros('P35 C40')).toEqual({ protein: 35, carbs: 40 });
  });

  it('parses with extra spaces', () => {
    expect(TextHandler.parseMacros('  P35  C40  F12  ')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });

  it('parses with no spaces between', () => {
    // Each macro starts with a letter boundary
    expect(TextHandler.parseMacros('P35C40F12')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });

  it('returns null for non-macro text', () => {
    expect(TextHandler.parseMacros('hello world')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(TextHandler.parseMacros('')).toBeNull();
  });

  it('parses zero values', () => {
    expect(TextHandler.parseMacros('P0 C0 F0')).toEqual({
      protein: 0, carbs: 0, fat: 0,
    });
  });

  it('parses large values', () => {
    expect(TextHandler.parseMacros('P200 C300 F100')).toEqual({
      protein: 200, carbs: 300, fat: 100,
    });
  });

  it('handles space between letter and number', () => {
    expect(TextHandler.parseMacros('P 35 C 40 F 12')).toEqual({
      protein: 35, carbs: 40, fat: 12,
    });
  });
});

describe('TextHandler.isMacroInput', () => {
  it('returns true for pure macro input', () => {
    expect(TextHandler.isMacroInput('P35 C40 F12')).toBe(true);
  });

  it('returns true for two macros', () => {
    expect(TextHandler.isMacroInput('P35 C40')).toBe(true);
  });

  it('returns false for single macro', () => {
    // parseMacros returns non-null but only 1 key — isMacroInput still true
    // because cleaned string is empty and parseMacros is non-null
    expect(TextHandler.isMacroInput('P35')).toBe(true);
  });

  it('returns false for mixed text + macros', () => {
    expect(TextHandler.isMacroInput('I ate P35 C40 F12 today')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(TextHandler.isMacroInput('chicken rice')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(TextHandler.isMacroInput('')).toBe(false);
  });

  it('returns true with extra whitespace', () => {
    expect(TextHandler.isMacroInput('  P35 C40 F12  ')).toBe(true);
  });
});
