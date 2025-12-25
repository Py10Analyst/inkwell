-- Complete setup for likes and bookmarks functionality
-- Run this entire script in your Supabase SQL Editor

-- ============================================
-- 1. CREATE POST_LIKES TABLE
-- ============================================

-- Create likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;

-- Create policies for likes
CREATE POLICY "Likes are viewable by everyone"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. ADD LIKE_COUNT COLUMN TO POSTS
-- ============================================

-- Add like_count column to posts for efficient counting
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- ============================================
-- 3. CREATE BOOKMARKS TABLE
-- ============================================

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

-- Create policies for bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. CREATE TRIGGER FOR AUTOMATIC LIKE COUNT
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_post_likes_trigger ON post_likes;
DROP FUNCTION IF EXISTS update_post_likes();

-- Function to automatically update like count
CREATE OR REPLACE FUNCTION update_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER update_post_likes_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes();

-- ============================================
-- 5. UPDATE EXISTING LIKE COUNTS
-- ============================================

-- Update existing like counts to match current likes
UPDATE posts
SET like_count = (
  SELECT COUNT(*)
  FROM post_likes
  WHERE post_likes.post_id = posts.id
);

-- ============================================
-- VERIFICATION QUERIES (Optional - Run separately to check)
-- ============================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('post_likes', 'bookmarks');

-- Check if trigger exists
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'update_post_likes_trigger';

-- Check like counts
-- SELECT id, title, like_count FROM posts LIMIT 10;
