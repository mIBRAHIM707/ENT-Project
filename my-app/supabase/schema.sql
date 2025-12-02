-- ============================================
-- CampusGig Database Schema for GIKI
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (for student info)
-- Must be created BEFORE jobs table (foreign key dependency)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Cached from auth.users for easy querying
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- This trigger automatically creates a profile when a new user signs up
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROFILES RLS (Row Level Security)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (to see who posted jobs)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

-- Users can update their own profile only
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (fallback if trigger fails)
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Trigger for profiles updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Job Details
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  urgency TEXT NOT NULL DEFAULT 'Flexible',
  location TEXT NOT NULL DEFAULT 'Campus',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  
  -- Poster Info (references Supabase Auth) - NOW REQUIRED
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- JOBS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON jobs(user_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at DESC);

-- ============================================
-- JOBS RLS (Row Level Security)
-- No more guest mode - authentication required for posting
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read jobs (public read)
CREATE POLICY "Jobs are viewable by everyone"
  ON jobs
  FOR SELECT
  USING (true);

-- Policy: ONLY authenticated users can insert jobs (NO GUEST MODE)
CREATE POLICY "Authenticated users can insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own jobs only
CREATE POLICY "Users can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own jobs only
CREATE POLICY "Users can delete their own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for jobs updated_at
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Jobs with Poster Info
-- Easy querying with profile data joined
-- ============================================
CREATE OR REPLACE VIEW jobs_with_poster AS
SELECT 
  j.id,
  j.title,
  j.description,
  j.price,
  j.urgency,
  j.location,
  j.status,
  j.created_at,
  j.updated_at,
  j.user_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url
FROM jobs j
LEFT JOIN profiles p ON j.user_id = p.id;

-- ============================================
-- HELPER FUNCTION: Get user email by ID
-- ============================================
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT email FROM profiles WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- CONVERSATIONS TABLE
-- Links a job with a worker (applicant)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The job this conversation is about
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- The worker/applicant (NOT the job owner)
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one conversation per job per worker
  UNIQUE(job_id, worker_id)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS conversations_job_id_idx ON conversations(job_id);
CREATE INDEX IF NOT EXISTS conversations_worker_id_idx ON conversations(worker_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversations they're part of (as job owner or worker)
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR 
    auth.uid() IN (SELECT user_id FROM jobs WHERE id = job_id)
  );

-- Policy: Authenticated users can create conversations (as worker applying)
CREATE POLICY "Workers can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = worker_id);

-- Trigger for conversations updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MESSAGES TABLE
-- Individual messages within a conversation
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The conversation this message belongs to
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Who sent the message
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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

-- Policy: Users can update their own messages (mark as read)
CREATE POLICY "Users can update messages in their conversations"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE c.worker_id = auth.uid() OR j.user_id = auth.uid()
    )
  );

-- ============================================
-- VIEW: Messages with sender info
-- ============================================
CREATE OR REPLACE VIEW messages_with_sender AS
SELECT 
  m.id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.is_read,
  m.created_at,
  p.email AS sender_email,
  p.full_name AS sender_name,
  p.avatar_url AS sender_avatar
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id;

-- ============================================
-- Enable Realtime for messages table
-- This allows clients to subscribe to new messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
