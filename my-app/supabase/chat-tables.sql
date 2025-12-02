-- ============================================
-- CHAT TABLES FOR CROWDSERVE
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS conversations_job_id_idx ON conversations(job_id);
CREATE INDEX IF NOT EXISTS conversations_worker_id_idx ON conversations(worker_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Workers can create conversations" ON conversations;

-- Policy: Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR 
    auth.uid() IN (SELECT user_id FROM jobs WHERE id = job_id)
  );

-- Policy: Workers can create conversations
CREATE POLICY "Workers can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = worker_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

-- Policy: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE c.worker_id = auth.uid() OR j.user_id = auth.uid()
    )
  );

-- Policy: Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT c.id FROM conversations c
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE c.worker_id = auth.uid() OR j.user_id = auth.uid()
    )
  );

-- ============================================
-- ENABLE REALTIME FOR MESSAGES
-- This is CRITICAL for real-time chat to work!
-- ============================================

-- First, check if the publication exists and add the table
DO $$
BEGIN
  -- Try to add messages to the realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Publication doesn't exist, create it
    CREATE PUBLICATION supabase_realtime FOR TABLE messages;
END $$;

-- ============================================
-- VERIFY SETUP
-- ============================================
-- Run these to verify tables were created:
-- SELECT * FROM conversations LIMIT 1;
-- SELECT * FROM messages LIMIT 1;
