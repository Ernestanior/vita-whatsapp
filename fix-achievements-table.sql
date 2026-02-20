-- Fix achievements table - Add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns to achievements table
ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS achievement_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (achievement_tier IN ('bronze', 'silver', 'gold', 'platinum'));

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS emoji TEXT;

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS earned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements(achievement_tier);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'achievements'
ORDER BY ordinal_position;
