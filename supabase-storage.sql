-- ============================================================
-- STORAGE BUCKET POLICIES — DUETAPP
-- Run in Supabase SQL Editor
-- ============================================================

-- VIDEOS BUCKET
-- Public read (anyone can watch)
CREATE POLICY "videos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Authenticated users can delete (ownership checked in app code)
CREATE POLICY "videos_delete_authenticated"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

-- ============================================================
-- SONGS BUCKET
-- Public read
CREATE POLICY "songs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'songs');

-- Only admin can delete songs
CREATE POLICY "songs_delete_admin"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'songs' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- VERIFY
-- ============================================================
SELECT bucket_id, name, definition
FROM storage.policies
ORDER BY bucket_id, name;
