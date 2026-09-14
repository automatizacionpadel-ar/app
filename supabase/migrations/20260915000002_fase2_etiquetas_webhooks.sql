-- Fase 2: Etiquetas, webhooks y mejoras inbox
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Etiquetas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etiquetas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#7AB619',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, nombre)
);

ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS etiquetas_negocio_idx ON etiquetas (negocio_id);

CREATE TABLE IF NOT EXISTS cliente_etiquetas (
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, etiqueta_id)
);

ALTER TABLE cliente_etiquetas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cliente_etiquetas_etiqueta_idx ON cliente_etiquetas (etiqueta_id);

CREATE TABLE IF NOT EXISTS conversacion_etiquetas (
  conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  etiqueta_id     UUID NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversacion_id, etiqueta_id)
);

ALTER TABLE conversacion_etiquetas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS conversacion_etiquetas_etiqueta_idx ON conversacion_etiquetas (etiqueta_id);

-- ─── 2. Webhooks por tenant ───────────────────────────────────
CREATE TABLE IF NOT EXISTS negocio_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  eventos     TEXT[] NOT NULL DEFAULT ARRAY['nuevo_mensaje','nuevo_cliente','conversacion_cerrada'],
  activo      BOOLEAN NOT NULL DEFAULT true,
  secret      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE negocio_webhooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS negocio_webhooks_negocio_idx ON negocio_webhooks (negocio_id);

-- ─── 3. RLS helpers ya existen (auth_negocio_ids, is_superadmin) ─

DROP POLICY IF EXISTS "etiquetas_tenant_all" ON etiquetas;
CREATE POLICY "etiquetas_tenant_all" ON etiquetas FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

DROP POLICY IF EXISTS "cliente_etiquetas_tenant" ON cliente_etiquetas;
CREATE POLICY "cliente_etiquetas_tenant" ON cliente_etiquetas FOR ALL USING (
  EXISTS (SELECT 1 FROM etiquetas e WHERE e.id = cliente_etiquetas.etiqueta_id AND (is_superadmin() OR e.negocio_id IN (SELECT auth_negocio_ids())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM etiquetas e WHERE e.id = cliente_etiquetas.etiqueta_id AND (is_superadmin() OR e.negocio_id IN (SELECT auth_negocio_ids())))
);

DROP POLICY IF EXISTS "conversacion_etiquetas_tenant" ON conversacion_etiquetas;
CREATE POLICY "conversacion_etiquetas_tenant" ON conversacion_etiquetas FOR ALL USING (
  EXISTS (SELECT 1 FROM etiquetas e WHERE e.id = conversacion_etiquetas.etiqueta_id AND (is_superadmin() OR e.negocio_id IN (SELECT auth_negocio_ids())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM etiquetas e WHERE e.id = conversacion_etiquetas.etiqueta_id AND (is_superadmin() OR e.negocio_id IN (SELECT auth_negocio_ids())))
);

DROP POLICY IF EXISTS "webhooks_tenant_all" ON negocio_webhooks;
CREATE POLICY "webhooks_tenant_all" ON negocio_webhooks FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- ─── 4. Notificaciones log extiende si no existe (para segmentadas) ─
-- mensajes_promo ya existe para historial de campañas, no necesita cambio

-- Trigger webhook invocador (opcional, solo registra en audit_logs por ahora; n8n lo consume via polling o via pg_notify)
-- No creamos pg_net calls aquí para no depender de extensión; el backend Node disparará webhooks
