# Propuesta Arquitectura SaaS Multi-tenant PWA — SimplificIA v2

> Fecha: 2026-09-14 · Branch: `main` · Backup: `app-simplificia-backup-20260914-114310`

---

## 0. Resumen Ejecutivo

El proyecto actual (`src/app/app/[slug]/chat/page.tsx:103`, `src/app/dashboard/*`, `src/middleware.ts:5`) ya es multi-tenant por `negocio_id` y tiene ~80% del MVP que propones. La adaptación NO requiere reescribir desde cero: requiere **renombrar/generalizar el dominio, endurecer RLS y completar mensajería nativa + PWA**.

---

## 1. Análisis del Concepto

**Fortalezas:**
- QR/NFC como "puerta de entrada" + PWA + Web Push es técnicamente sólido y evita App Store (fricción cero).
- Modelo B2B2C con SaaS recurrente validado por tu base actual (medicos → negocios).
- Ya tenés infraestructura Supabase + Vercel + web-push lista.

**Riesgos / Puntos débiles detectados:**

| # | Riesgo | Impacto |
|---|--------|---------|
| 1 | **Web Push en iOS es frágil**: requiere "Add to Home Screen", permiso explícito, y Safari mata Service Workers agresivamente. | Alto — expectativa "notificación aunque PWA cerrada" no se cumple 100% en iOS <16.4 |
| 2 | **Dependencia n8n**: `src/app/api/chat/route.ts` proxyea a webhook n8n. Si n8n cae, chat muerto. GPT-4o-mini alucinaba tool calls (nota en CLAUDE.md). | Medio — latencia + single point of failure |
| 3 | **Chat polling cada 5s** (`src/app/app/[slug]/chat/page.tsx:183`): no es Realtime. No escala, consume batería. | Medio |
| 4 | **RLS incompleto**: `chat_sessions`, `mensajes`, `clientes` usan `service_role` y `ENABLE ROW LEVEL SECURITY` sin policies → aislamiento solo por `WHERE negocio_id` en código. | Crítico — viola requisito 6 |
| 5 | **Slug como identificador tenant**: sin validación de ownership en `src/app/api/negocios/publico/route.ts`. | Medio |
| 6 | **Un solo `usuario_id` por negocio** (`negocios.usuario_id`): no soporta múltiples empleados/asignación. | Bloquea rol EMPLEADO |
| 7 | **`/app/[slug]` hard-redirect a `/chat`**: no hay landing PWA con botones (Hablar, Servicios, Promos). No parece "mini-app". | Alto — contradice punto 2 del prompt |

---

## 2. Arquitectura General Propuesta

```
                    ┌─ QR / NFC / Link ─────────────────┐
                    │  https://app.midominio.com/c/[slug]?camp=xxx │
                    └──────────────┬─────────────────────┘
                                   ▼
                  ┌─────────────────────────────────┐
                  │  Next.js 14 (App Router)         │
                  │  ┌──────────┐  ┌──────────────┐  │
                  │  │ /c/[slug]│  │ /c/[slug]/chat│ │
                  │  │  Landing │  │  Mensajería  │  │
                  │  │  PWA     │  │  + Push opt-in│ │
                  │  └──────────┘  └──────────────┘  │
                  │  ┌──────────┐  ┌──────────────┐  │
                  │  │/dashboard│  │ /admin       │  │
                  │  │ (tenant) │  │ (superadmin) │  │
                  │  └──────────┘  └──────────────┘  │
                  └──────────────┬──────────────────┘
                                 │ SSR + RLS
                    ┌────────────▼────────────┐
                    │  Supabase               │
                    │  Postgres + RLS         │
                    │  Auth + Realtime        │
                    │  Storage (logos/PDFs)   │
                    └────────────┬────────────┘
                                 │ webhooks/events
                    ┌────────────▼────────────┐
                    │  n8n (opcional Fase 2)  │
                    │  Automatizaciones       │
                    └─────────────────────────┘
```

**Decisiones clave:**
- **Next.js API Routes + Server Actions** (sin backend separado).
- **Supabase Realtime** reemplaza polling (`mensajes` canal por `negocio_id+chat_id`).
- **n8n desacoplado**: mensajes se guardan primero en DB; n8n es consumer async via webhook, no proxy sincrónico.
- **Service Worker** en `public/sw.js` (ya existe) + `manifest.json` dinámico por tenant.

---

## 3. Estructura de Carpetas (Next.js)

```
src/
├── app/
│   ├── (public)/
│   │   └── c/[slug]/
│   │       ├── page.tsx              # Landing PWA (logo, descripción, botones)
│   │       ├── chat/page.tsx         # Chat cliente (migrar de app/[slug]/chat)
│   │       ├── servicios/page.tsx    # (futuro, placeholder)
│   │       └── promos/page.tsx       # (futuro)
│   ├── (tenant)/
│   │   └── dashboard/                # renombrar /dashboard → (tenant)/dashboard
│   │       ├── layout.tsx            # auth + tenant guard
│   │       ├── page.tsx              # Dashboard métricas
│   │       ├── mensajeria/           # Inbox Realtime
│   │       ├── clientes/
│   │       ├── notificaciones/
│   │       ├── config/               # branding
│   │       └── qr/                   # generador QR + campañas (NUEVO)
│   ├── (superadmin)/
│   │   └── admin/                    # ya existe, mantener
│   ├── api/
│   │   ├── negocios/[id]/branding/   # NUEVO: manifest dinámico
│   │   ├── clientes/registrar/
│   │   ├── chat/                     # REFACT: guardar + emitir Realtime + webhook n8n async
│   │   ├── push/
│   │   └── webhooks/n8n/             # NUEVO: inbound n8n → insert mensaje assistant + push
│   ├── login/
│   └── manifest/[slug]/route.ts      # NUEVO: manifest.json dinámico por tenant
├── components/
│   ├── pwa/                          # LandingCard, BrandingHeader, PushOptIn
│   ├── chat/                         # Burbuja, Composer, RealtimeProvider
│   └── dashboard/                    # reutilizar existentes
├── hooks/
│   ├── usePushNotifications.ts       # ya existe, extender
│   ├── useRealtimeChat.ts            # NUEVO
│   └── useTenant.ts                  # NUEVO: resolver slug → tenant
├── lib/
│   ├── supabase/server.ts            # mantener createClient / createAdminClient
│   ├── supabase/rls.ts               # NUEVO: helpers RLS
│   ├── tenant.ts                     # NUEVO: getTenantBySlug, assertMembership
│   └── qr.ts                         # NUEVO: generador con ?camp=
└── types/
    └── database.ts                   # regenerar con supabase gen types

public/
├── sw.js                             # extender: manejo push + click open_url
├── icons/                            # por tenant fallback
supabase/
└── migrations/
    ├── 20260914_mensajeria_nativa.sql
    ├── 20260914_rls_tenant_isolation.sql
    ├── 20260914_membership_y_roles.sql
    └── 20260914_qr_campanias.sql
```

**Compatibilidad:** mantener redirect `src/app/app/[slug]/page.tsx:4` → `/c/[slug]` por 3 meses para no romper QRs impresos.

---

## 4. Modelo de Datos PostgreSQL

### 4.1 Mantener (renombrar si hace falta)
- `usuarios(id, email, rol)` — FK a `auth.users`
- `negocios(id, usuario_id, nombre, slug, rubro, logo_url, color_marca, ...)`
- `clientes(id, negocio_id, nombre, apellido, email, celular, ...)` — UNIQUE(negocio_id, celular)
- `citas`, `recetas`, `suscripciones` — ya existen, agregar `negocio_id` consistente

### 4.2 Crear / Refactorizar para Fase 1

```sql
-- Membership: soporta múltiples empleados por tenant
CREATE TABLE negocio_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin_empresa','empleado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(negocio_id, usuario_id)
);

-- Conversaciones (agregada a mensajes existentes)
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  chat_id TEXT NOT NULL, -- compat con localStorage simplificia_chat_id
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada','pendiente')),
  asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  unread_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(negocio_id, chat_id)
);

-- Mensajes: extender existente
-- ya existe `mensajes(id, negocio_id, cliente_id, chat_id, role, content, image_url, created_at)`
-- Agregar:
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'enviado'
  CHECK (estado IN ('enviado','entregado','leido'));
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Push subscriptions: ya existe, agregar
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);

-- Branding por empresa (extender negocios)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS imagen_portada_url TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS color_secundario TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS texto_bienvenida TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ocultar_marca_plataforma BOOLEAN DEFAULT false;

-- QR / Campañas
CREATE TABLE qr_campanias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL, -- ej: 'recepcion', 'publi-verano'
  nombre TEXT NOT NULL,
  url TEXT NOT NULL, -- /c/slug?camp=codigo
  scans INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(negocio_id, codigo)
);

-- Planes y límites (preparación facturación)
CREATE TABLE planes (
  id TEXT PRIMARY KEY, -- 'basic','pro','enterprise'
  nombre TEXT NOT NULL,
  limite_clientes INT,
  limite_empleados INT,
  limite_notificaciones_mes INT,
  precio_mensual NUMERIC(10,2),
  features JSONB DEFAULT '{}'
);
-- suscripciones ya existe; agregar plan_id
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES planes(id);

-- Auditoría
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  negocio_id UUID REFERENCES negocios(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Fase 2+ (solo reservas de ID, no crear ahora)
`etiquetas`, `cliente_etiquetas`, `conversacion_etiquetas`, `notificaciones_log`, `webhook_eventos`

---

## 5. Estrategia Multi-tenant

**Opción elegida para MVP: Path-based `/c/[slug]`**

| Criterio | `app.midominio.com/c/slug` | `slug.midominio.com` |
|---|---|---|
| DNS/SSL | Cero config | Wildcard + cert por subdominio |
| Vercel | Funciona out-of-box | Requiere rewrites + middleware host parsing |
| QR impreso | Cambiable sin reimprimir (redirect) | Idem pero más frágil |
| RLS | `negocio_id = get_negocio_id(slug)` | Igual |

**Recomendación:** MVP = `/c/[slug]` (ya tenés `/app/[slug]` funcionando). Fase 3 agregar soporte subdominio vía `middleware.ts` leyendo `host` header.

**Aislamiento:**
- Cada fila tiene `negocio_id`.
- Acceso siempre filtrado por `negocio_id` derivado de `slug` o `auth.uid() → negocio_miembros`.
- Índices: `CREATE INDEX ON clientes(negocio_id)`, `ON mensajes(negocio_id, chat_id, created_at)`.

---

## 6. Políticas RLS (Row Level Security)

**Principio:** `service_role` BYPASS RLS solo en cron/Edge Functions. Todo lo demás pasa por `anon`+RLS.

```sql
-- Helper: tenant del usuario logueado
CREATE OR REPLACE FUNCTION auth_negocio_ids() RETURNS SETOF UUID AS $$
  SELECT negocio_id FROM negocio_miembros WHERE usuario_id = auth.uid()
  UNION
  SELECT id FROM negocios WHERE usuario_id = auth.uid() -- owner legacy
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ejemplo: clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_clientes_select" ON clientes
  FOR SELECT USING (
    negocio_id IN (SELECT auth_negocio_ids())
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol='superadmin')
  );

CREATE POLICY "tenant_isolation_clientes_insert" ON clientes
  FOR INSERT WITH CHECK ( negocio_id IN (SELECT auth_negocio_ids()) );

CREATE POLICY "public_can_register_as_cliente" ON clientes
  FOR INSERT WITH CHECK (
    -- permite registro anónimo solo vía api con slug válido
    -- validado por function is_valid_slug(negocio_id)
    true -- restringido en API, no directo desde cliente
  );

-- Conversaciones / mensajes: idem
CREATE POLICY "tenant_mensajes_all" ON mensajes
  FOR ALL USING (negocio_id IN (SELECT auth_negocio_ids()))
  WITH CHECK (negocio_id IN (SELECT auth_negocio_ids()));

-- Negocios: lectura pública por slug para landing PWA
CREATE POLICY "public_read_negocio_by_slug" ON negocios
  FOR SELECT USING (true); -- solo columnas branding, no sensibles

-- Superadmin bypass
CREATE POLICY "superadmin_all" ON negocios FOR ALL
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id=auth.uid() AND rol='superadmin'));
```

**Storage RLS:** buckets `negocio-assets/{negocio_id}/*` con policy `auth_negocio_ids()`.

---

## 7. Roles y Permisos

| Rol | `usuarios.rol` | Alcance | Permisos |
|-----|----------------|---------|----------|
| `superadmin` | `superadmin` | Global | CRUD negocios, ver métricas globales, suspender tenant, gestionar planes |
| `admin_empresa` | `negocio` + `negocio_miembros.rol='admin_empresa'` | Su `negocio_id` | Todo dentro del tenant: branding, empleados, inbox, clientes, campañas, config |
| `empleado` | `negocio` + `rol='empleado'` | Su `negocio_id` filtrado | Ver/responder conversaciones asignadas, ver clientes, NO config/branding/empleados |
| `cliente` | **no tiene fila en `usuarios`** — es `clientes` + `chat_id` en localStorage | Su `chat_id` | Ver su landing, registrarse, chatear solo su conversación, gestionar su push subscription |

**Auth split:**
- Dashboard/Admin → Supabase Auth (email+password).
- Cliente → **no requiere login obligatorio** para MVP. `chat_id` anónimo + registro opcional (nombre/tel). Fase 2: OTP por SMS si hace falta.

---

## 8. Flujo Cliente Completo (QR/NFC → Chat)

```
1. QR impreso → https://app.midominio.com/c/clinica-xyz?camp=recepcion
2. Middleware resuelve slug → negocio_id, incrementa qr_campanias.scans
3. Landing PWA (/c/[slug]): muestra logo, nombre, descripción, color_marca
   Botones: [Hablar con nosotros] [Servicios] [Promos] [Mi cuenta]
   + banner "Agrega a inicio para notificaciones" (beforeinstallprompt)
4. Click "Hablar" → /c/[slug]/chat
   - Genera/recupera localStorage simplificia_chat_id (UUID)
   - GET /api/negocios/publico?slug=xyz → branding
   - GET /api/chat/historial?chat_id=xxx → mensajes previos (Realtime subscribe)
5. Cliente escribe → POST /api/chat {negocio_id, chat_id, message}
   - API crea cliente si no existe (upsert por celular si se proveyó)
   - Inserta en `mensajes` (role=user) + upsert `conversaciones`
   - Supabase Realtime emite → dashboard ve mensaje al instante
   - Dispara webhook async a n8n (si configurado) → no bloquea respuesta
6. Registro simplificado: modal pide solo `nombre + celular` (email opcional)
   - POST /api/clientes/registrar → vincula chat_id→cliente_id en chat_sessions
7. Push opt-in: botón "Recibir notificaciones" → Notification.requestPermission()
   → subscribe pushManager → POST /api/push/suscribir {cliente_id, subscription}
8. Empresa responde desde dashboard → INSERT mensajes (role=assistant)
   → Realtime → cliente ve burbuja + Service Worker muestra Push si PWA cerrada
9. Cierre: empresa marca conversación 'cerrada'; cliente puede reabrir escribiendo
```

---

## 9. Flujo Administración Empresa

```
Login /login → middleware.ts:5 redirige por rol
Dashboard (/dashboard):
  - KPIs: clientes registrados, conversaciones abiertas/pendientes, mensajes hoy
  - Gráficos: nuevos clientes 30d, tasa respuesta
Mensajería (/dashboard/mensajeria):
  - Lista conversaciones ordenadas por last_message_at
  - Filtros: abiertas/cerradas, asignadas a mí, búsqueda por nombre/celular
  - Panel chat: historial + composer + asignar empleado + cerrar/reabrir
Clientes (/dashboard/clientes):
  - Tabla con registro, última interacción, estado, acciones
Notificaciones (/dashboard/campanias):
  - Enviar push individual/masiva/segmentada (Fase 2: segmentación por etiqueta)
Config (/dashboard/config):
  - Branding: logo, colores, descripción, texto bienvenida, ocultar marca
QR (/dashboard/qr) NUEVO:
  - Ver QR principal + crear QRs por campaña (código, scans)
```

---

## 10. MVP Definitivo (Recomendación)

**Tu Fase 1 es correcta pero necesita ajustes:**

✅ Mantener en Fase 1:
- Multi-tenant + RLS
- Branding básico (logo, colores, descripción)
- Landing PWA por tenant (`/c/[slug]`)
- Registro cliente minimal (nombre + celular, email opcional) — **NO pedir los 3 obligatorios**
- Chat nativo cliente↔empresa sin IA obligatoria (IA opcional vía n8n)
- Panel empresa (inbox Realtime + clientes)
- Push Web (subscribe + enviar individual)
- QR dinámico por tenant + contador scans
- Roles básicos (superadmin, admin_empresa, empleado lectura)
- SuperAdmin básico (CRUD negocios, suspender)

➕ Agregar a Fase 1 (faltaban y son críticos):
- **Manifest dinámico por tenant** (`/manifest/[slug]/route.ts`)
- **Realtime en vez de polling**
- **Tabla `conversaciones` con estado/asignación**

➖ Mover a Fase 2 (para no bloquear MVP):
- Notificaciones masivas/segmentadas (dejar solo individual en F1)
- Etiquetas y asignación avanzada
- Campañas con imagen/rich content (ya existe pero simplificar)

**Fase 2:** segmentación, etiquetas, campañas masivas, n8n automatizaciones, estadísticas avanzadas, webhooks.
**Fase 3:** reservas/turnos (ya tenés `citas`), pedidos, fidelización, WhatsApp, IA/chatbot marketplace.

---

## 11. Qué Desarrollar Primero (orden)

1. **Migraciones DB** (`supabase/migrations/20260914_*.sql`): `negocio_miembros`, `conversaciones`, `qr_campanias`, RLS.
2. **Middleware + tenant helper** (`src/lib/tenant.ts`, `src/middleware.ts`): resolver slug, guards.
3. **Landing PWA** (`src/app/c/[slug]/page.tsx`): branding + botones + PWA install prompt.
4. **Manifest dinámico** (`src/app/manifest/[slug]/route.ts`) + `public/sw.js` mejorado.
5. **Refactor chat a Realtime** (`src/hooks/useRealtimeChat.ts`, `src/app/api/chat/route.ts` sin proxy n8n bloqueante).
6. **Panel QR** (`src/app/dashboard/qr/`).
7. **Hardening RLS** y tests manuales cross-tenant.

---

## 12. Próximos Pasos

- [ ] Confirmás esta propuesta (o marcás cambios).
- [ ] Genero migraciones + landing + manifest + realtime en PR incremental (no todo junto).
- [ ] Verificamos con `npm run build` y pruebas manuales en dev.

> Backup del proyecto original en: `/Users/gus/Developer/app-simplificia-backup-20260914-114310`
> Para restaurar: `rsync -a /Users/gus/Developer/app-simplificia-backup-20260914-114310/ /Users/gus/Developer/app-simplificia/`

