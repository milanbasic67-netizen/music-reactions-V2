-- ============================================================
-- RLS POLICIES FOR DUETAPP
-- Run this in Supabase SQL Editor
-- ============================================================

-- Helper: check if the current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- REACTIONS
-- ============================================================
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_public" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "reactions_insert_own" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own_or_admin" ON reactions
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- LIKES
-- ============================================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_public" ON likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_authenticated" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own_or_admin" ON comments
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- FOLLOWS
-- (uses usernames, so we join with profiles to verify ownership)
-- ============================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public" ON follows
  FOR SELECT USING (true);

CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND username = follower_username
    )
  );

CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND username = follower_username
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND username = notifications.username
    )
  );

-- Allow authenticated users to create notifications for others
-- (e.g. "user X liked your video" — actor inserts, recipient reads)
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND username = notifications.username
    )
  );

-- ============================================================
-- SONGS
-- ============================================================
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "songs_select_public" ON songs
  FOR SELECT USING (true);

CREATE POLICY "songs_insert_admin" ON songs
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "songs_update_admin" ON songs
  FOR UPDATE USING (is_admin());

CREATE POLICY "songs_delete_admin" ON songs
  FOR DELETE USING (is_admin());
