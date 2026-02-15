-- Migration 009: Stripe Events Idempotency
-- Description: Add stripe_events table to prevent duplicate event processing
-- Issue: Stripe webhooks may be retried, causing duplicate processing

-- Create stripe_events table for idempotency
CREATE TABLE stripe_events (
  event_id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX idx_stripe_events_user ON stripe_events(user_id);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at);

-- Add comment
COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events to ensure idempotency';

-- Function to check if event has been processed
CREATE OR REPLACE FUNCTION is_stripe_event_processed(
  p_event_id VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM stripe_events WHERE event_id = p_event_id
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to record processed event
CREATE OR REPLACE FUNCTION record_stripe_event(
  p_event_id VARCHAR,
  p_event_type VARCHAR,
  p_user_id UUID,
  p_payload JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO stripe_events (event_id, event_type, user_id, payload)
  VALUES (p_event_id, p_event_type, p_user_id, p_payload)
  ON CONFLICT (event_id) DO NOTHING;
  
  -- Return true if inserted, false if already existed
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_stripe_event_processed IS 'Checks if a Stripe event has already been processed';
COMMENT ON FUNCTION record_stripe_event IS 'Records a Stripe event to prevent duplicate processing';
