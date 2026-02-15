-- Migration 008: Fix Quota Race Condition
-- Description: Add atomic check_and_increment_quota function to prevent race conditions
-- Issue: Multiple concurrent requests could bypass quota limits

-- Drop existing increment_usage function (will be replaced)
DROP FUNCTION IF EXISTS increment_usage(UUID, DATE);

-- Create atomic check and increment function
CREATE OR REPLACE FUNCTION check_and_increment_quota(
  p_user_id UUID,
  p_date DATE,
  p_limit INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  used INTEGER
) AS $$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  -- Use FOR UPDATE to lock the row and prevent concurrent modifications
  SELECT recognitions_used, recognitions_limit 
  INTO v_current, v_limit
  FROM usage_quotas
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;
  
  -- If no record exists, create a new one with usage = 1
  IF v_current IS NULL THEN
    INSERT INTO usage_quotas (user_id, date, recognitions_used, recognitions_limit)
    VALUES (p_user_id, p_date, 1, p_limit);
    RETURN QUERY SELECT TRUE, p_limit - 1, 1;
    RETURN;
  END IF;
  
  -- Check if quota is exceeded
  IF v_current >= v_limit THEN
    RETURN QUERY SELECT FALSE, 0, v_current;
    RETURN;
  END IF;
  
  -- Increment usage count atomically
  UPDATE usage_quotas 
  SET recognitions_used = recognitions_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;
  
  RETURN QUERY SELECT TRUE, v_limit - v_current - 1, v_current + 1;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION check_and_increment_quota IS 
  'Atomically checks quota and increments usage count to prevent race conditions';

-- Keep the old increment_usage for backward compatibility (but it should not be used)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_date DATE
) RETURNS void AS $$
BEGIN
  -- This function is deprecated, use check_and_increment_quota instead
  INSERT INTO usage_quotas (user_id, date, recognitions_used, recognitions_limit)
  VALUES (p_user_id, p_date, 1, 3)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    recognitions_used = usage_quotas.recognitions_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
