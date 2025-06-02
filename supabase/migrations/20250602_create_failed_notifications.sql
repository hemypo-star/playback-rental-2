
-- Create table for storing failed notifications for retry
CREATE TABLE IF NOT EXISTS failed_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('contact', 'checkout')),
  data JSONB NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'failed' CHECK (status IN ('failed', 'retry', 'success')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_failed_notifications_status ON failed_notifications(status);
CREATE INDEX IF NOT EXISTS idx_failed_notifications_next_retry ON failed_notifications(next_retry_at) WHERE status = 'retry';
CREATE INDEX IF NOT EXISTS idx_failed_notifications_type ON failed_notifications(type);

-- Add RLS policies
ALTER TABLE failed_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage failed notifications
CREATE POLICY "Service role can manage failed notifications" ON failed_notifications
FOR ALL USING (auth.role() = 'service_role');
