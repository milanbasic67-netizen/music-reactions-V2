-- ============================================================
-- RLS POLICIES FOR DUETAPP
-- Run this in Supabase SQL Editor
-- ============================================================

-- Helper: check if the current user is admin
-- Uses ::text cast to handle both uuid and text id columns
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id::text = auth.uid()::text);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id::text = auth.uid()::text);

-- ============================================================
-- REACTIONS
-- ============================================================
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_public" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "reactions_insert_own" ON reactions
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "reactions_delete_own_or_admin" ON reactions
  FOR DELETE USING (user_id::text = auth.uid()::text OR is_admin());

-- ============================================================
-- LIKES
-- ============================================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_public" ON likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- ============================================================
-- COMMENTS
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_authenticated" ON comments
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "comments_delete_own_or_admin" ON comments
  FOR DELETE USING (user_id::text = auth.uid()::text OR is_admin());

-- ============================================================
-- FOLLOWS
-- ============================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public" ON follows
  FOR SELECT USING (true);

CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = auth.uid()::text AND username = follower_username
    )
  );

CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = auth.uid()::text AND username = follower_username
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
      WHERE id::text = auth.uid()::text AND username = notifications.username
    )
  );

CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = auth.uid()::text AND username = notifications.username
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
