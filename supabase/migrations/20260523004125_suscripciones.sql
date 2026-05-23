CREATE TABLE suscripciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       uuid REFERENCES medicos(id) ON DELETE CASCADE NOT NULL,
  monto           numeric(10,2) NOT NULL,
  fecha_pago      date NOT NULL,
  periodo_inicio  date NOT NULL,
  periodo_fin     date NOT NULL,
  estado          text NOT NULL DEFAULT 'pagado'
                    CHECK (estado IN ('pagado', 'pendiente', 'vencido')),
  notas           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin full access" ON suscripciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
  );
