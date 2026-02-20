// User and Health Profile Types
export interface User {
  id: string;
  phoneNumber: string;
  whatsappName?: string;
  language: 'en' | 'zh-CN' | 'zh-TW';
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthProfile {
  userId: string;
  height: number; // cm
  weight: number; // kg
  age?: number;
  gender?: 'male' | 'female';
  goal: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  digestTime: string; // HH:mm format
  quickMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Food Recognition Types
export interface NutritionData {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fat: { min: number; max: number };
  sodium: { min: number; max: number };
}

export interface FoodItem {
  name: string;
  nameLocal: string;
  confidence: number; // 0-100
  portion: string;
  nutriGrade?: 'A' | 'B' | 'C' | 'D';
  giLevel?: 'Low' | 'Medium' | 'High';
  isHawkerFood?: boolean;
  improvementTip?: string;
  nutrition: NutritionData;
}

export interface FoodRecognitionResult {
  foods: FoodItem[];
  totalNutrition: NutritionData;
  mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// Health Rating Types
export type RatingLevel = 'green' | 'yellow' | 'red';
export type FactorStatus = 'good' | 'moderate' | 'poor';

export interface HealthFactor {
  name: string;
  status: FactorStatus;
  message: string;
}

export interface HealthRating {
  overall: RatingLevel;
  score: number; // 0-100
  factors: HealthFactor[];
  suggestions: string[];
}

// Subscription Types
export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// WhatsApp Message Types
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'interactive';
  text?: { body: string };
  image?: { id: string; mimeType: string; sha256: string };
  interactive?: InteractiveMessage;
}

export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply';
  buttonReply?: { id: string; title: string };
  listReply?: { id: string; title: string; description?: string };
}

// Error Types
export enum ErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNSUPPORTED_CONTENT = 'UNSUPPORTED_CONTENT',
  AI_API_ERROR = 'AI_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  WHATSAPP_API_ERROR = 'WHATSAPP_API_ERROR',
  STRIPE_ERROR = 'STRIPE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorResponse {
  errorId: string;
  type: ErrorType;
  message: string;
  suggestion?: string;
  retryable: boolean;
}

// Daily Digest Types
export interface DailyDigest {
  userId: string;
  date: string;
  summary: {
    totalCalories: number;
    mealsCount: number;
    nutritionBreakdown: {
      protein: number;
      carbs: number;
      fat: number;
      sodium: number;
    };
    healthScore: number;
    ratingDistribution: {
      green: number;
      yellow: number;
      red: number;
    };
  };
  insights: string[];
  recommendations: string[];
  exerciseSuggestion?: string;
}
