/**
 * Check if environment variables are set
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGoogleAI = !!process.env.GOOGLE_AI_API_KEY;
  
  return NextResponse.json({
    success: true,
    env: {
      OPENAI_API_KEY: hasOpenAI ? 'Set ✅' : 'Missing ❌',
      GOOGLE_AI_API_KEY: hasGoogleAI ? 'Set ✅' : 'Missing ❌',
      OPENAI_KEY_LENGTH: hasOpenAI ? process.env.OPENAI_API_KEY?.length : 0,
      GOOGLE_KEY_LENGTH: hasGoogleAI ? process.env.GOOGLE_AI_API_KEY?.length : 0,
    },
    note: hasGoogleAI 
      ? 'Google AI API key is configured' 
      : 'Google AI API key is MISSING - please add it to Vercel environment variables',
  });
}
