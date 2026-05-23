-- Fix: add WITH CHECK to storage UPDATE policy so doctors cannot move
-- objects into another doctor's folder after upload.
DROP POLICY IF EXISTS "medico update own photos" ON storage.objects;

CREATE POLICY "medico update own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'medico-fotos'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'medico-fotos'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
  )
);

-- Enforce 2 MB file size limit and restrict MIME types on the bucket.
UPDATE storage.buckets
SET
  file_size_limit    = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'medico-fotos';
