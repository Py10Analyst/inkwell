-- Ensure like count column exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Drop existing functions and trigger if they exist
DROP TRIGGER IF EXISTS update_post_likes_trigger ON post_likes;
DROP FUNCTION IF EXISTS update_post_likes();
DROP FUNCTION IF EXISTS increment_likes(UUID);
DROP FUNCTION IF EXISTS decrement_likes(UUID);

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

-- Update existing like counts to match current likes
UPDATE posts
SET like_count = (
  SELECT COUNT(*)
  FROM post_likes
  WHERE post_likes.post_id = posts.id
);
