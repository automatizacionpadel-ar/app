-- Bucket público para PDFs de recetas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recetas',
  'recetas',
  true,
  5242880,  -- 5MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Médico puede subir/reemplazar sus propias recetas
CREATE POLICY "medico sube sus recetas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recetas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "medico actualiza sus recetas" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'recetas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'recetas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
    )
  );

-- Lectura pública (para que el paciente pueda abrir el PDF)
CREATE POLICY "lectura publica recetas" ON storage.objects
  FOR SELECT USING (bucket_id = 'recetas');
