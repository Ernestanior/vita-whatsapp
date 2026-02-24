-- 012: Add fitness-specific fields to health_profiles
-- P1-5: training_type, protein_target, carb_target

ALTER TABLE health_profiles
  ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT 'none'
    CHECK (training_type IN ('none','strength','cardio','mixed')),
  ADD COLUMN IF NOT EXISTS protein_target REAL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carb_target REAL DEFAULT NULL;

COMMENT ON COLUMN health_profiles.training_type IS 'User training style: none, strength, cardio, mixed';
COMMENT ON COLUMN health_profiles.protein_target IS 'Manual protein target override (grams). NULL = auto-calculate';
COMMENT ON COLUMN health_profiles.carb_target IS 'Manual carb target override (grams). NULL = auto-calculate';
