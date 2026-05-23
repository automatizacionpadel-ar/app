-- Nuevos campos en medicos
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS foto_perfil_url      text,
  ADD COLUMN IF NOT EXISTS logo_url             text,
  ADD COLUMN IF NOT EXISTS precio_consulta      numeric(10,2),
  ADD COLUMN IF NOT EXISTS acepta_agendamientos boolean NOT NULL DEFAULT true;

-- Bucket público para fotos de médicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('medico-fotos', 'medico-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- El médico sólo puede subir/pisar sus propias fotos
CREATE POLICY "medico upload own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medico-fotos'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "medico update own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'medico-fotos'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "public read medico photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'medico-fotos');
