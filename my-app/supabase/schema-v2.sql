-- ============================================
-- CampusGig Database Schema V2
-- New Features: Search, Task Lifecycle, Ratings
-- ============================================

-- ============================================
-- UPDATE JOBS TABLE: Add category and assigned_to
-- ============================================

-- Add category column for filtering
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- Add assigned worker (who the job is assigned to)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add completed_at timestamp
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS jobs_category_idx ON jobs(category);
CREATE INDEX IF NOT EXISTS jobs_assigned_to_idx ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS jobs_price_idx ON jobs(price);
CREATE INDEX IF NOT EXISTS jobs_urgency_idx ON jobs(urgency);
CREATE INDEX IF NOT EXISTS jobs_location_idx ON jobs(location);

-- Full text search index for title and description
CREATE INDEX IF NOT EXISTS jobs_search_idx ON jobs USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================
-- RATINGS TABLE
-- Users can rate each other after task completion
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The job this rating is for
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Who is giving the rating
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Who is being rated
  rated_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rating value (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Optional review text
  review TEXT,
  
  -- Type: 'poster_to_helper' or 'helper_to_poster'
  rating_type TEXT NOT NULL CHECK (rating_type IN ('poster_to_helper', 'helper_to_poster')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can only rate once per job per direction
  UNIQUE(job_id, rater_id, rating_type)
);

-- Indexes for ratings
CREATE INDEX IF NOT EXISTS ratings_rated_id_idx ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS ratings_rater_id_idx ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS ratings_job_id_idx ON ratings(job_id);

-- Enable RLS for ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings (for reputation)
CREATE POLICY "Ratings are viewable by everyone"
  ON ratings
  FOR SELECT
  USING (true);

-- Only authenticated users involved in the job can create ratings
CREATE POLICY "Users can rate after job completion"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (
      SELECT 1 FROM jobs j 
      WHERE j.id = job_id 
      AND j.status = 'completed'
      AND (j.user_id = auth.uid() OR j.assigned_to = auth.uid())
    )
  );

-- ============================================
-- ADD RATING STATS TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0;

-- ============================================
-- FUNCTION: Update user rating stats
-- Called after a new rating is inserted
-- ============================================
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update rating stats
DROP TRIGGER IF EXISTS on_rating_created ON ratings;
CREATE TRIGGER on_rating_created
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_stats();

-- ============================================
-- FUNCTION: Update tasks completed count
-- Called when a job status changes to 'completed'
-- ============================================
CREATE OR REPLACE FUNCTION update_tasks_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update helper's completed count
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE profiles
      SET tasks_completed = tasks_completed + 1
      WHERE id = NEW.assigned_to;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for tasks completed
DROP TRIGGER IF EXISTS on_job_completed ON jobs;
CREATE TRIGGER on_job_completed
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_completed();

-- ============================================
-- UPDATE VIEW: Jobs with Poster Info (add new columns)
-- Must DROP first because we're changing column structure
-- ============================================
DROP VIEW IF EXISTS jobs_with_poster CASCADE;

CREATE VIEW jobs_with_poster AS
SELECT 
  j.id,
  j.title,
  j.description,
  j.price,
  j.urgency,
  j.location,
  j.category,
  j.status,
  j.assigned_to,
  j.completed_at,
  j.created_at,
  j.updated_at,
  j.user_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url,
  p.average_rating AS poster_rating,
  p.total_ratings AS poster_total_ratings,
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.avatar_url AS assigned_avatar
FROM jobs j
LEFT JOIN profiles p ON j.user_id = p.id
LEFT JOIN profiles ap ON j.assigned_to = ap.id;

-- ============================================
-- VIEW: User ratings with details
-- ============================================
CREATE OR REPLACE VIEW ratings_with_details AS
SELECT 
  r.id,
  r.job_id,
  r.rating,
  r.review,
  r.rating_type,
  r.created_at,
  r.rater_id,
  r.rated_id,
  rater.full_name AS rater_name,
  rater.avatar_url AS rater_avatar,
  rated.full_name AS rated_name,
  j.title AS job_title
FROM ratings r
LEFT JOIN profiles rater ON r.rater_id = rater.id
LEFT JOIN profiles rated ON r.rated_id = rated.id
LEFT JOIN jobs j ON r.job_id = j.id;

-- ============================================
-- FUNCTION: Search jobs with filters
-- ============================================
CREATE OR REPLACE FUNCTION search_jobs(
  search_query TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_urgency TEXT DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT 'open',
  min_price INTEGER DEFAULT NULL,
  max_price INTEGER DEFAULT NULL,
  sort_by TEXT DEFAULT 'newest'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price INTEGER,
  urgency TEXT,
  location TEXT,
  category TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  student_name TEXT,
  student_email TEXT,
  avatar_url TEXT,
  poster_rating DECIMAL,
  assigned_to UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    j.price,
    j.urgency,
    j.location,
    j.category,
    j.status,
    j.created_at,
    j.user_id,
    p.full_name AS student_name,
    p.email AS student_email,
    p.avatar_url,
    p.average_rating AS poster_rating,
    j.assigned_to
  FROM jobs j
  LEFT JOIN profiles p ON j.user_id = p.id
  WHERE 
    -- Status filter
    (filter_status IS NULL OR j.status = filter_status)
    -- Search query (full text search on title and description)
    AND (search_query IS NULL OR search_query = '' OR 
         to_tsvector('english', coalesce(j.title, '') || ' ' || coalesce(j.description, '')) @@ plainto_tsquery('english', search_query))
    -- Category filter
    AND (filter_category IS NULL OR filter_category = '' OR j.category = filter_category)
    -- Urgency filter
    AND (filter_urgency IS NULL OR filter_urgency = '' OR j.urgency = filter_urgency)
    -- Location filter
    AND (filter_location IS NULL OR filter_location = '' OR j.location = filter_location)
    -- Price range filter
    AND (min_price IS NULL OR j.price >= min_price)
    AND (max_price IS NULL OR j.price <= max_price)
  ORDER BY
    CASE WHEN sort_by = 'newest' THEN j.created_at END DESC,
    CASE WHEN sort_by = 'oldest' THEN j.created_at END ASC,
    CASE WHEN sort_by = 'price_low' THEN j.price END ASC,
    CASE WHEN sort_by = 'price_high' THEN j.price END DESC,
    CASE WHEN sort_by = 'urgency' THEN 
      CASE j.urgency 
        WHEN 'ASAP' THEN 1 
        WHEN 'Today' THEN 2 
        WHEN '3 days' THEN 3 
        WHEN 'This week' THEN 4 
        ELSE 5 
      END 
    END ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable Realtime for jobs table (for live updates)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- ============================================
-- Policy: Allow job owners to update assigned_to and status
-- (Update existing policy to allow status changes)
-- ============================================
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
CREATE POLICY "Users can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow assigned workers to mark job as completed
CREATE POLICY "Assigned workers can update job status"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to AND status IN ('in_progress', 'completed'));
