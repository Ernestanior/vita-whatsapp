import { z } from 'zod';

const envSchema = z.object({
  // AI API
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_ORG_ID: z.string().optional(),
  
  // WhatsApp
  WHATSAPP_TOKEN: z.string().min(1, 'WhatsApp token is required'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, 'WhatsApp phone number ID is required'),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1, 'WhatsApp verify token is required'),
  WHATSAPP_APP_SECRET: z.string().min(1, 'WhatsApp app secret is required for signature verification'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'Supabase service key is required'),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PREMIUM_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  
  // Upstash Redis
  UPSTASH_REDIS_URL: z.string().url('Invalid Upstash Redis URL'),
  UPSTASH_REDIS_TOKEN: z.string().min(1, 'Upstash Redis token is required'),
  
  // Security
  ENCRYPTION_KEY: z.string().length(64, 'Encryption key must be 64 hex characters (32 bytes)').optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  
  // Feature Flags
  ENABLE_CACHING: z
    .string()
    .optional()
    .default('true')
    .transform(val => val === 'true'),
  ENABLE_COST_ALERTS: z
    .string()
    .optional()
    .default('true')
    .transform(val => val === 'true'),
  MAX_DAILY_COST: z
    .string()
    .optional()
    .default('100')
    .transform(val => parseFloat(val)),
  
  // App Config
  NEXT_PUBLIC_URL: z.string().url('Invalid app URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Testing
  TEST_WHATSAPP_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

export const env = validateEnv();

// Convenience aliases
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
