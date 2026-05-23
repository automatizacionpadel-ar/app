-- Mapeo persistente chat_id → paciente_id
-- Se guarda cuando /api/chat recibe paciente_id de n8n, se consulta al crear la cita

CREATE TABLE chat_sessions (
  chat_id     TEXT PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id   UUID NOT NULL REFERENCES medicos(id)   ON DELETE CASCADE,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
-- Solo service_role accede; sin policies públicas
