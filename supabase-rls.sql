-- ============================================================
-- RLS POLICIES — DUETAPP (schema-verified version)
-- Run in Supabase SQL Editor
-- ============================================================

-- Add missing columns first
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Helper admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES  (id: uuid)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"    ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own"    ON profiles FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- REACTIONS  (user_id: uuid)
-- ============================================================
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select_public"       ON reactions;
DROP POLICY IF EXISTS "reactions_insert_own"          ON reactions;
DROP POLICY IF EXISTS "reactions_delete_own_or_admin" ON reactions;

CREATE POLICY "reactions_select_public"       ON reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own"          ON reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_delete_own_or_admin" ON reactions FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- LIKES  (user_id: text)
-- ============================================================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_public" ON likes;
DROP POLICY IF EXISTS "likes_insert_own"    ON likes;
DROP POLICY IF EXISTS "likes_delete_own"    ON likes;

CREATE POLICY "likes_select_public" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own"    ON likes FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "likes_delete_own"    ON likes FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================================
-- COMMENTS  (no user_id — uses username column)
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_public"       ON comments;
DROP POLICY IF EXISTS "comments_insert_authenticated" ON comments;
DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON comments;

CREATE POLICY "comments_select_public"        ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_authenticated" ON comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = comments.username)
);
CREATE POLICY "comments_delete_own_or_admin"  ON comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = comments.username) OR is_admin()
);

-- ============================================================
-- FOLLOWS  (follower_username / following_username: text)
-- ============================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select_public" ON follows;
DROP POLICY IF EXISTS "follows_insert_own"    ON follows;
DROP POLICY IF EXISTS "follows_delete_own"    ON follows;

CREATE POLICY "follows_select_public" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON follows FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = follower_username)
);
CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = follower_username)
);

-- ============================================================
-- NOTIFICATIONS  (username: text)
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own"          ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own"          ON notifications;

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = notifications.username)
);
CREATE POLICY "notifications_insert_authenticated" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND username = notifications.username)
);

-- ============================================================
-- SONGS  (admin-only write, user_id: uuid)
-- ============================================================
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_public" ON songs;
DROP POLICY IF EXISTS "songs_insert_admin"  ON songs;
DROP POLICY IF EXISTS "songs_update_admin"  ON songs;
DROP POLICY IF EXISTS "songs_delete_admin"  ON songs;

CREATE POLICY "songs_select_public" ON songs FOR SELECT USING (true);
CREATE POLICY "songs_insert_admin"  ON songs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "songs_update_admin"  ON songs FOR UPDATE USING (is_admin());
CREATE POLICY "songs_delete_admin"  ON songs FOR DELETE USING (is_admin());

-- ============================================================
-- VERIFY
-- ============================================================
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
