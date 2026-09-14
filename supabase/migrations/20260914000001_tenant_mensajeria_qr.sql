-- ═══════════════════════════════════════════════════════════════════
-- SaaS PWA Multi-tenant — Fase 1 MVP
-- Tablas: negocio_miembros, conversaciones, qr_campanias, planes, audit_logs
-- Extensiones: branding en negocios, estado en mensajes, RLS
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Negocios: campos branding adicionales ──────────────────────────
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS descripcion              TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS imagen_portada_url       TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS color_secundario         TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS texto_bienvenida         TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ocultar_marca_plataforma BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS activo                   BOOLEAN NOT NULL DEFAULT true;
-- color_marca y logo_url ya existen (ver 20260523125219)

-- ─── 2. Mensajes: columna estado + metadata si no existen ─────────────
-- mensajes ya existe con (id, negocio_id, cliente_id, chat_id, role, content, image_url, created_at)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes' AND column_name='estado') THEN
    ALTER TABLE mensajes ADD COLUMN estado TEXT NOT NULL DEFAULT 'enviado'
      CHECK (estado IN ('enviado','entregado','leido'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes' AND column_name='metadata') THEN
    ALTER TABLE mensajes ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS mensajes_negocio_chat_created_idx ON mensajes (negocio_id, chat_id, created_at);
CREATE INDEX IF NOT EXISTS mensajes_cliente_idx ON mensajes (cliente_id) WHERE cliente_id IS NOT NULL;

-- ─── 3. negocio_miembros: múltiples empleados por tenant ──────────────
CREATE TABLE IF NOT EXISTS negocio_miembros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol         TEXT NOT NULL CHECK (rol IN ('admin_empresa','empleado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, usuario_id)
);

ALTER TABLE negocio_miembros ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS negocio_miembros_negocio_idx ON negocio_miembros (negocio_id);
CREATE INDEX IF NOT EXISTS negocio_miembros_usuario_idx ON negocio_miembros (usuario_id);

-- Migrar owner legacy: cada negocio.usuario_id → miembro admin_empresa (idempotente)
INSERT INTO negocio_miembros (negocio_id, usuario_id, rol)
SELECT id, usuario_id, 'admin_empresa' FROM negocios WHERE usuario_id IS NOT NULL
ON CONFLICT (negocio_id, usuario_id) DO NOTHING;

-- ─── 4. conversaciones: estado, asignación, unread ────────────────────
CREATE TABLE IF NOT EXISTS conversaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  chat_id         TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada','pendiente')),
  asignado_a      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  unread_count    INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, chat_id)
);

ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS conversaciones_negocio_last_idx ON conversaciones (negocio_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversaciones_cliente_idx ON conversaciones (cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS conversaciones_chat_idx ON conversaciones (chat_id);

-- Backfill conversaciones desde mensajes existentes (idempotente)
-- MAX(uuid) no existe en Postgres, usamos array_agg para el último cliente_id no-nulo
INSERT INTO conversaciones (negocio_id, cliente_id, chat_id, last_message_at, last_message_preview)
SELECT
  negocio_id,
  (array_agg(cliente_id ORDER BY created_at DESC) FILTER (WHERE cliente_id IS NOT NULL))[1],
  chat_id,
  MAX(created_at),
  (array_agg(LEFT(content, 120) ORDER BY created_at DESC))[1]
FROM mensajes GROUP BY negocio_id, chat_id
ON CONFLICT (negocio_id, chat_id) DO NOTHING;

-- Trigger: mantener updated_at
CREATE OR REPLACE FUNCTION touch_conversaciones_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversaciones_touch ON conversaciones;
CREATE TRIGGER trg_conversaciones_touch BEFORE UPDATE ON conversaciones
  FOR EACH ROW EXECUTE FUNCTION touch_conversaciones_updated_at();

-- Trigger: al insertar mensaje, upsert conversación
CREATE OR REPLACE FUNCTION sync_conversacion_on_mensaje() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversaciones (negocio_id, cliente_id, chat_id, last_message_at, last_message_preview, unread_count)
  VALUES (
    NEW.negocio_id,
    NEW.cliente_id,
    NEW.chat_id,
    NEW.created_at,
    LEFT(NEW.content, 120),
    CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END
  )
  ON CONFLICT (negocio_id, chat_id) DO UPDATE SET
    cliente_id = COALESCE(EXCLUDED.cliente_id, conversaciones.cliente_id),
    last_message_at = GREATEST(conversaciones.last_message_at, EXCLUDED.last_message_at),
    last_message_preview = EXCLUDED.last_message_preview,
    unread_count = CASE WHEN NEW.role = 'user' THEN conversaciones.unread_count + 1 ELSE conversaciones.unread_count END,
    updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_conversacion ON mensajes;
CREATE TRIGGER trg_sync_conversacion AFTER INSERT ON mensajes
  FOR EACH ROW EXECUTE FUNCTION sync_conversacion_on_mensaje();

-- ─── 5. qr_campanias: QR por campaña/ubicación ────────────────────────
CREATE TABLE IF NOT EXISTS qr_campanias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  url         TEXT NOT NULL,
  scans       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, codigo)
);

ALTER TABLE qr_campanias ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS qr_campanias_negocio_idx ON qr_campanias (negocio_id);

-- ─── 6. Planes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes (
  id                          TEXT PRIMARY KEY,
  nombre                      TEXT NOT NULL,
  limite_clientes             INT,
  limite_empleados            INT,
  limite_notificaciones_mes   INT,
  precio_mensual              NUMERIC(10,2),
  features                    JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO planes (id, nombre, limite_clientes, limite_empleados, limite_notificaciones_mes, precio_mensual, features)
VALUES
  ('basic',      'Basic',      500,  2,  1000,  29.99, '{"branding": false, "qr_campanias": 1}'::jsonb),
  ('pro',        'Pro',        5000, 10, 10000, 79.99, '{"branding": true, "qr_campanias": 5, "realtime": true}'::jsonb),
  ('enterprise', 'Enterprise', NULL, NULL, NULL, 199.99, '{"branding": true, "qr_campanias": -1, "realtime": true, "api": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Agregar plan_id a suscripciones si no existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suscripciones' AND column_name='plan_id') THEN
    ALTER TABLE suscripciones ADD COLUMN plan_id TEXT REFERENCES planes(id);
  END IF;
END $$;

-- ─── 7. Audit logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  negocio_id  UUID REFERENCES negocios(id) ON DELETE SET NULL,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion      TEXT NOT NULL,
  entidad     TEXT NOT NULL,
  entidad_id  TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_logs_negocio_idx ON audit_logs (negocio_id, created_at DESC);

-- ─── 8. Push subscriptions: asegurar índices ──────────────────────────
CREATE INDEX IF NOT EXISTS push_subscriptions_negocio_idx ON push_subscriptions (negocio_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_cliente_idx ON push_subscriptions (cliente_id) WHERE cliente_id IS NOT NULL;

-- ─── 9. Helpers & RLS ─────────────────────────────────────────────────

-- Helper: tenant ids del usuario autenticado
CREATE OR REPLACE FUNCTION auth_negocio_ids() RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT negocio_id FROM negocio_miembros WHERE usuario_id = auth.uid()
  UNION
  SELECT id FROM negocios WHERE usuario_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
$$;

-- RLS: negocio_miembros
DROP POLICY IF EXISTS "miembros_select_own" ON negocio_miembros;
CREATE POLICY "miembros_select_own" ON negocio_miembros FOR SELECT USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

DROP POLICY IF EXISTS "miembros_admin_manage" ON negocio_miembros;
CREATE POLICY "miembros_admin_manage" ON negocio_miembros FOR ALL USING (
  is_superadmin() OR EXISTS (
    SELECT 1 FROM negocio_miembros m
    WHERE m.negocio_id = negocio_miembros.negocio_id
      AND m.usuario_id = auth.uid() AND m.rol = 'admin_empresa'
  )
) WITH CHECK (
  is_superadmin() OR EXISTS (
    SELECT 1 FROM negocio_miembros m
    WHERE m.negocio_id = negocio_miembros.negocio_id
      AND m.usuario_id = auth.uid() AND m.rol = 'admin_empresa'
  )
);

-- RLS: conversaciones
DROP POLICY IF EXISTS "conversaciones_tenant_all" ON conversaciones;
CREATE POLICY "conversaciones_tenant_all" ON conversaciones FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- RLS: qr_campanias
DROP POLICY IF EXISTS "qr_tenant_all" ON qr_campanias;
CREATE POLICY "qr_tenant_all" ON qr_campanias FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- RLS: mensajes (si no existe policy tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mensajes' AND policyname='mensajes_tenant_all') THEN
    CREATE POLICY "mensajes_tenant_all" ON mensajes FOR ALL USING (
      is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
    ) WITH CHECK (
      is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
    );
  END IF;
END $$;

-- RLS: clientes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clientes' AND policyname='clientes_tenant_all') THEN
    CREATE POLICY "clientes_tenant_all" ON clientes FOR ALL USING (
      is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
    ) WITH CHECK (
      is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
    );
  END IF;
END $$;

-- RLS: negocios — lectura pública limitada para landing (anon puede leer branding por slug)
-- Mantener policies existentes si las hay; agregar public read para columnas branding
DROP POLICY IF EXISTS "negocios_public_read_branding" ON negocios;
CREATE POLICY "negocios_public_read_branding" ON negocios FOR SELECT USING (true);

-- RLS: audit_logs
DROP POLICY IF EXISTS "audit_tenant_select" ON audit_logs;
CREATE POLICY "audit_tenant_select" ON audit_logs FOR SELECT USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- RLS: planes (lectura pública)
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planes_public_read" ON planes;
CREATE POLICY "planes_public_read" ON planes FOR SELECT USING (true);

-- Habilitar Realtime para mensajes y conversaciones
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversaciones;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
