-- Profile Setup Sessions Table
-- Stores temporary session data for multi-step profile setup

CREATE TABLE IF NOT EXISTS profile_setup_sessions (
  user_id TEXT PRIMARY KEY,
  current_step TEXT NOT NULL,
  session_data JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_profile_setup_sessions_expires_at 
ON profile_setup_sessions(expires_at);

-- Enable RLS
ALTER TABLE profile_setup_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access to profile_setup_sessions"
ON profile_setup_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profile_setup_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profile_setup_sessions_updated_at_trigger ON profile_setup_sessions;
CREATE TRIGGER update_profile_setup_sessions_updated_at_trigger
BEFORE UPDATE ON profile_setup_sessions
FOR EACH ROW
EXECUTE FUNCTION update_profile_setup_sessions_updated_at();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_profile_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM profile_setup_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON profile_setup_sessions TO service_role;
