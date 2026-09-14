-- Fase 3: Módulos Servicios, Pedidos y Fidelización
-- ═══════════════════════════════════════════════════════════════

-- ─── Extender negocios con flags de módulos ────────────────────
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS modulos_habilitados TEXT[] DEFAULT ARRAY['chat','qr','etiquetas','campanias','servicios','reservas','webhooks'];
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'ARS';

-- ─── 1. Servicios / Catálogo ───────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagen_url  TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  orden       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS servicios_negocio_idx ON servicios (negocio_id, activo, orden);

DROP POLICY IF EXISTS "servicios_tenant_all" ON servicios;
CREATE POLICY "servicios_tenant_all" ON servicios FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- Lectura pública para PWA (anon puede ver servicios activos por slug vía join)
DROP POLICY IF EXISTS "servicios_public_read" ON servicios;
CREATE POLICY "servicios_public_read" ON servicios FOR SELECT USING (activo = true);

-- ─── 2. Pedidos / Presupuestos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  chat_id     TEXT,
  estado      TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','en_preparacion','listo','entregado','cancelado')),
  total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS pedidos_negocio_idx ON pedidos (negocio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON pedidos (cliente_id);

DROP POLICY IF EXISTS "pedidos_tenant_all" ON pedidos;
CREATE POLICY "pedidos_tenant_all" ON pedidos FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL,
  nombre      TEXT NOT NULL,
  precio      NUMERIC(10,2) NOT NULL,
  cantidad    INT NOT NULL DEFAULT 1,
  subtotal    NUMERIC(10,2) NOT NULL
);
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
-- acceso via pedido tenant
DROP POLICY IF EXISTS "pedido_items_tenant" ON pedido_items;
CREATE POLICY "pedido_items_tenant" ON pedido_items FOR ALL USING (
  EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_items.pedido_id AND (is_superadmin() OR p.negocio_id IN (SELECT auth_negocio_ids())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_items.pedido_id AND (is_superadmin() OR p.negocio_id IN (SELECT auth_negocio_ids())))
);

-- ─── 3. Fidelización: programa, puntos, cupones ────────────────
CREATE TABLE IF NOT EXISTS fidelizacion_config (
  negocio_id           UUID PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
  puntos_por_peso      NUMERIC(5,2) NOT NULL DEFAULT 1,
  pesos_por_punto      NUMERIC(10,2) NOT NULL DEFAULT 1,
  activo               BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fidelizacion_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fidelizacion_config_tenant" ON fidelizacion_config;
CREATE POLICY "fidelizacion_config_tenant" ON fidelizacion_config FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

CREATE TABLE IF NOT EXISTS fidelizacion_puntos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  puntos      INT NOT NULL,
  motivo      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, cliente_id, created_at)
);
-- se usa historial, no unique estricto; simplificamos sin unique
ALTER TABLE fidelizacion_puntos DROP CONSTRAINT IF EXISTS fidelizacion_puntos_negocio_id_cliente_id_created_at_key;
ALTER TABLE fidelizacion_puntos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS fidelizacion_puntos_cliente_idx ON fidelizacion_puntos (cliente_id);
CREATE INDEX IF NOT EXISTS fidelizacion_puntos_negocio_idx ON fidelizacion_puntos (negocio_id);

DROP POLICY IF EXISTS "fidelizacion_puntos_tenant" ON fidelizacion_puntos;
CREATE POLICY "fidelizacion_puntos_tenant" ON fidelizacion_puntos FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);

-- Vista saldo puntos por cliente
CREATE OR REPLACE VIEW fidelizacion_saldo AS
SELECT negocio_id, cliente_id, COALESCE(SUM(puntos),0)::int AS saldo
FROM fidelizacion_puntos GROUP BY negocio_id, cliente_id;

CREATE TABLE IF NOT EXISTS cupones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,
  descuento_porcentaje INT CHECK (descuento_porcentaje BETWEEN 1 AND 100),
  descuento_fijo NUMERIC(10,2),
  uso_maximo  INT,
  usos        INT NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true,
  vence_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id, codigo)
);
ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cupones_negocio_idx ON cupones (negocio_id, activo);

DROP POLICY IF EXISTS "cupones_tenant_all" ON cupones;
CREATE POLICY "cupones_tenant_all" ON cupones FOR ALL USING (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
) WITH CHECK (
  is_superadmin() OR negocio_id IN (SELECT auth_negocio_ids())
);
DROP POLICY IF EXISTS "cupones_public_read" ON cupones;
CREATE POLICY "cupones_public_read" ON cupones FOR SELECT USING (activo = true AND (vence_at IS NULL OR vence_at > now()));

-- ─── Planes: habilitar módulos según plan ──────────────────────
UPDATE planes SET features = features || '{"servicios": true, "pedidos": false, "fidelizacion": false}'::jsonb WHERE id = 'basic';
UPDATE planes SET features = features || '{"servicios": true, "pedidos": true, "fidelizacion": true}'::jsonb WHERE id IN ('pro','enterprise');
