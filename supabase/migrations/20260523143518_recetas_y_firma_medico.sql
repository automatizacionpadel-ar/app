-- Campos de firma en médicos
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS sello_url text,
  ADD COLUMN IF NOT EXISTS firma_url text;

-- Tabla de recetas
CREATE TABLE IF NOT EXISTS recetas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id    uuid REFERENCES medicos(id) ON DELETE CASCADE NOT NULL,
  paciente_id  uuid REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  medicamentos text[] NOT NULL,
  pdf_url      text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico gestiona sus recetas" ON recetas
  FOR ALL USING (
    medico_id = (SELECT id FROM medicos WHERE usuario_id = auth.uid())
  );
