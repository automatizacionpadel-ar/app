# Generalización Multi-Rubro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar todas las entidades del sistema de `medico/paciente` a `negocio/cliente` en DB, tipos, rutas API, dashboard, admin y n8n.

**Architecture:** Migración SQL primero (todas las tablas/columnas), luego cascade de cambios en TypeScript y UI. Sin cambios de lógica de negocio — solo renombres. Recetas queda como feature opcional activable solo por superadmin.

**Tech Stack:** Next.js 14, Supabase (PostgreSQL + REST API), TypeScript, n8n (via REST API)

**Supabase URL:** `https://efezqbfimbibevynlril.supabase.co`  
**n8n workflow ID:** `BGj5q2FB9UhqOhMS`  
**n8n base URL:** `https://n8n.simplificia.com.ar`

---

## Mapa de archivos

### Archivos a crear (nuevas rutas)
- `src/app/api/negocios/crear/route.ts` (mueve de `/api/medicos/crear`)
- `src/app/api/negocios/actualizar/route.ts` (mueve de `/api/medicos/actualizar`)
- `src/app/api/negocios/publico/route.ts` (mueve de `/api/medicos/publico`)
- `src/app/api/sesion/cliente/route.ts` (mueve de `/api/sesion/paciente`)
- `src/app/dashboard/clientes/page.tsx` (mueve de `/dashboard/pacientes`)
- `src/app/dashboard/clientes/ClientesCliente.tsx` (mueve de `PacientesCliente.tsx`)
- `src/app/dashboard/clientes/RecetaModal.tsx` (copia de `/dashboard/pacientes`)
- `src/app/admin/negocios/page.tsx` (mueve de `/admin/medicos`)
- `src/app/admin/negocios/nuevo/page.tsx` (mueve de `/admin/medicos/nuevo`)
- `supabase/migrations/20260525_generalizacion_multi_rubro.sql`

### Archivos a modificar
- `src/types/index.ts` — reescritura completa de tipos
- `src/middleware.ts` — `'medico'` → `'negocio'`
- `src/app/dashboard/layout.tsx` — queries + rol
- `src/app/dashboard/page.tsx` — queries + props
- `src/app/dashboard/calendario/page.tsx` — queries
- `src/app/dashboard/calendario/CalendarioCliente.tsx` — props + labels
- `src/app/dashboard/campanias/page.tsx` — queries + props
- `src/app/dashboard/campanias/CampaniasCliente.tsx` — props + labels
- `src/app/dashboard/config/page.tsx` — queries
- `src/app/dashboard/config/ConfigCliente.tsx` — tipos + API URL
- `src/app/admin/page.tsx` — queries
- `src/app/admin/layout.tsx` — ningún cambio necesario
- `src/app/api/chat/route.ts` — queries internas
- `src/app/api/citas/crear/route.ts` — queries + columnas
- `src/app/api/citas/disponibles/route.ts` — params + queries
- `src/app/api/campanias/enviar/route.ts` — params + queries
- `src/app/api/push/enviar/route.ts` — params + queries
- `src/app/api/recetas/crear/route.ts` — queries
- `src/app/api/clientes/registrar/route.ts` — columna `negocio_id`
- `src/components/layout/Sidebar.tsx` — labels + hrefs

### Archivos a eliminar (reemplazados por nuevas rutas)
- `src/app/api/medicos/` (dir completo)
- `src/app/api/sesion/paciente/` (dir completo)
- `src/app/dashboard/pacientes/` (dir completo)
- `src/app/admin/medicos/` (dir completo)

---

## Task 1: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260525_generalizacion_multi_rubro.sql`

- [ ] **Step 1: Crear el archivo de migración**

```bash
supabase migration new generalizacion_multi_rubro
```

Esto crea `supabase/migrations/20260525HHMMSS_generalizacion_multi_rubro.sql`. Renombralo a `20260525_generalizacion_multi_rubro.sql` si querés una fecha fija.

- [ ] **Step 2: Escribir el SQL de migración**

Reemplazá el contenido del archivo con:

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Generalización multi-rubro: médico/paciente → negocio/cliente
-- ═══════════════════════════════════════════════════════════════════

-- 1. RENOMBRAR TABLAS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE medicos           RENAME TO negocios;
ALTER TABLE pacientes         RENAME TO clientes;
ALTER TABLE medico_agente_config RENAME TO negocio_agente_config;
ALTER TABLE medico_faqs       RENAME TO negocio_faqs;

-- 2. RENOMBRAR COLUMNAS EN negocios
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE negocios RENAME COLUMN nombre_completo TO nombre;
ALTER TABLE negocios RENAME COLUMN especialidad    TO rubro;

-- 3. AGREGAR CAMPO habilitar_recetas (desactivado por defecto)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE negocios ADD COLUMN habilitar_recetas BOOLEAN NOT NULL DEFAULT false;

-- 4. RENOMBRAR medico_id → negocio_id EN TABLAS RELACIONADAS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE negocio_agente_config RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE negocio_faqs          RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE clientes              RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE citas                 RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE push_subscriptions    RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE recetas               RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE suscripciones         RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE chat_sessions         RENAME COLUMN medico_id TO negocio_id;

-- mensajes_promo si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mensajes_promo' AND column_name = 'medico_id') THEN
    ALTER TABLE mensajes_promo RENAME COLUMN medico_id TO negocio_id;
  END IF;
END$$;

-- notificaciones_log si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notificaciones_log' AND column_name = 'medico_id') THEN
    ALTER TABLE notificaciones_log RENAME COLUMN medico_id TO negocio_id;
  END IF;
END$$;

-- 5. RENOMBRAR paciente_id → cliente_id EN TABLAS RELACIONADAS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE citas              RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE push_subscriptions RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE recetas            RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE chat_sessions      RENAME COLUMN paciente_id TO cliente_id;

-- notificaciones_log si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notificaciones_log' AND column_name = 'paciente_id') THEN
    ALTER TABLE notificaciones_log RENAME COLUMN paciente_id TO cliente_id;
  END IF;
END$$;

-- 6. RENOMBRAR COLUMNAS EN citas
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE citas RENAME COLUMN motivo_consulta TO motivo;
ALTER TABLE citas RENAME COLUMN notas_medico    TO notas;

-- 7. ACTUALIZAR ROL EN usuarios
-- ─────────────────────────────────────────────────────────────────
UPDATE usuarios SET rol = 'negocio' WHERE rol = 'medico';
```

- [ ] **Step 3: Aplicar la migración**

```bash
supabase db push
```

Si el CLI pide confirmación, aceptar. Verificar que no haya errores en la salida.

- [ ] **Step 4: Verificar en Supabase Studio**

Abrir Supabase Studio → Table Editor. Confirmar que existen las tablas:
- `negocios` (antes `medicos`)
- `clientes` (antes `pacientes`)
- `negocio_agente_config`
- `negocio_faqs`

En `negocios`, confirmar que existen las columnas `nombre`, `rubro`, `habilitar_recetas`.  
En `clientes`, confirmar columna `negocio_id` (antes `medico_id`).  
En `citas`, confirmar columnas `negocio_id`, `cliente_id`, `motivo`, `notas`.  
En `usuarios`, confirmar que no hay registros con `rol = 'medico'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: migración DB — generalización multi-rubro (negocios/clientes)"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Reemplazar el contenido completo de `src/types/index.ts`**

```typescript
// src/types/index.ts

export type Rol = 'superadmin' | 'negocio'

export type EstadoCita  = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
export type MetodoPago  = 'mercadopago' | 'transferencia' | 'efectivo' | 'sin_pago'
export type EstadoPago  = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado'

// ─── Negocio ──────────────────────────────────────────────────────────────────

export interface HorarioDia {
  inicio: string   // "09:00"
  fin:    string   // "18:00"
  activo: boolean
}

export interface Horarios {
  lunes:     HorarioDia
  martes:    HorarioDia
  miercoles: HorarioDia
  jueves:    HorarioDia
  viernes:   HorarioDia
  sabado:    HorarioDia
  domingo:   HorarioDia
}

export interface Negocio {
  id:                   string
  usuario_id:           string
  slug:                 string | null
  nombre:               string
  rubro:                string
  telefono:             string | null
  email:                string | null
  direccion:            string | null
  descripcion:          string | null
  duracion_cita_min:    number
  horarios:             Horarios | null
  dias_anticipacion:    number
  requiere_sena:        boolean
  monto_sena:           number | null
  alias_mp:             string | null
  cbu:                  string | null
  titular_cuenta:       string | null
  mp_access_token:      string | null
  webhook_token:        string
  foto_perfil_url:      string | null
  logo_url:             string | null
  sello_url:            string | null
  firma_url:            string | null
  precio_consulta:      number | null
  acepta_agendamientos: boolean
  habilitar_recetas:    boolean
  activo:               boolean
  created_at:           string
  updated_at:           string
}

export interface NegocioAgenteConfig {
  id:                   string
  negocio_id:           string
  prompt_personalidad:  string
  tono:                 string
  idioma:               string
  mensaje_bienvenida:   string
  mensaje_confirmacion: string
  mensaje_recordatorio: string
  mensaje_cancelacion:  string
  created_at:           string
  updated_at:           string
}

export interface NegocioFaq {
  id:         string
  negocio_id: string
  pregunta:   string
  respuesta:  string
  orden:      number
  activo:     boolean
  created_at: string
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export interface Cliente {
  id:             string
  negocio_id:     string
  nombre:         string
  apellido:       string | null
  celular:        string | null
  email:          string | null
  push_activo:    boolean
  notas:          string | null
  total_citas:    number
  ultima_cita_at: string | null
  created_at:     string
  updated_at:     string
}

// ─── Cita ─────────────────────────────────────────────────────────────────────

export interface Cita {
  id:                         string
  negocio_id:                 string
  cliente_id:                 string
  fecha_inicio:               string
  fecha_fin:                  string
  estado:                     EstadoCita
  motivo:                     string | null
  notas:                      string | null
  metodo_pago:                MetodoPago
  estado_pago:                EstadoPago
  monto_sena:                 number | null
  mp_preference_id:           string | null
  mp_payment_id:              string | null
  external_reference:         string | null
  comprobante_url:            string | null
  recordatorio_24h_enviado:   boolean
  recordatorio_2h_enviado:    boolean
  origen:                     string
  created_at:                 string
  updated_at:                 string
  clientes?:                  Cliente
}

export interface CitaConCliente extends Cita {
  clientes: Cliente
}

// ─── Push ─────────────────────────────────────────────────────────────────────

export interface PushSubscription {
  id:           string
  cliente_id:   string
  negocio_id:   string
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth:   string
    }
  }
  user_agent:   string | null
  dispositivo:  string | null
  activo:       boolean
  created_at:   string
  last_used_at: string | null
}

// ─── Recetas ──────────────────────────────────────────────────────────────────

export interface Receta {
  id:           string
  negocio_id:   string
  cliente_id:   string
  medicamentos: string[]
  pdf_url:      string | null
  created_at:   string
}

// ─── Suscripciones ────────────────────────────────────────────────────────────

export interface Suscripcion {
  id:             string
  negocio_id:     string
  monto:          number
  fecha_pago:     string
  periodo_inicio: string
  periodo_fin:    string
  estado:         'pagado' | 'pendiente' | 'vencido'
  notas:          string | null
  created_at:     string
}

// ─── Campañas ─────────────────────────────────────────────────────────────────

export interface MensajePromo {
  id:             string
  negocio_id:     string
  titulo:         string
  contenido:      string
  segmento:       'todos' | 'inactivos_30d' | 'inactivos_60d'
  total_enviados: number
  total_fallidos: number
  enviado_at:     string | null
  borrador:       boolean
  created_at:     string
}

// ─── Formularios ──────────────────────────────────────────────────────────────

export interface FormNegocioNuevo {
  nombre:            string
  rubro:             string
  telefono:          string
  email:             string
  direccion:         string
  descripcion:       string
  duracion_cita_min: number
  dias_anticipacion: number
  horarios:          Horarios
  requiere_sena:     boolean
  monto_sena:        number | null
  alias_mp:          string
  cbu:               string
  titular_cuenta:    string
  mp_access_token:   string
  prompt_personalidad:  string
  tono:                 string
  mensaje_bienvenida:   string
  mensaje_confirmacion: string
  mensaje_recordatorio: string
  mensaje_cancelacion:  string
  faqs: Array<{ pregunta: string; respuesta: string; orden: number }>
  email_acceso:    string
  password_acceso: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface StatCard {
  titulo:    string
  valor:     string | number
  subtitulo: string
  icono:     string
  tendencia?: {
    valor:    number
    positivo: boolean
  }
}

export interface NavItem {
  label:        string
  href:         string
  icon:         string
  badge?:       number
  adminOnly?:   boolean
  clienteOnly?: boolean
}
```

- [ ] **Step 2: Verificar que no haya errores de TypeScript**

```bash
npm run lint
```

Habrá errores (los archivos que usan los tipos viejos aún no están actualizados). Ignorar por ahora — se resuelven en las tasks siguientes.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: tipos TypeScript — Negocio/Cliente (era Medico/Paciente)"
```

---

## Task 3: Rutas API — negocios

**Files:**
- Create: `src/app/api/negocios/crear/route.ts`
- Create: `src/app/api/negocios/actualizar/route.ts`
- Create: `src/app/api/negocios/publico/route.ts`
- Delete: `src/app/api/medicos/` (directorio completo)

- [ ] **Step 1: Crear directorio y archivo `negocios/crear/route.ts`**

```bash
mkdir -p src/app/api/negocios/crear
```

Contenido de `src/app/api/negocios/crear/route.ts`:

```typescript
// src/app/api/negocios/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slugify'

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  nombre: string
): Promise<string> {
  const base = slugify(nombre) || 'negocio'
  let candidate = base
  let i = 2
  while (true) {
    const { data } = await supabase
      .from('negocios')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i++}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nombre, rubro, telefono, email,
      direccion, descripcion, duracion_cita_min, dias_anticipacion,
      horarios, requiere_sena, monto_sena, alias_mp, cbu, titular_cuenta,
      prompt_personalidad, tono, idioma,
      mensaje_bienvenida, mensaje_confirmacion, mensaje_recordatorio, mensaje_cancelacion,
      faqs, email_acceso, password_acceso,
    } = body

    if (!nombre || !rubro || !email_acceso || !password_acceso) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:         email_acceso,
      password:      password_acceso,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Error al crear el usuario' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    let slug: string
    try {
      slug = await generateUniqueSlug(supabase, nombre)
    } catch {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al generar el identificador' }, { status: 500 })
    }

    const { error: usuarioError } = await supabase
      .from('usuarios')
      .insert({ id: userId, rol: 'negocio' })

    if (usuarioError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al registrar el usuario' }, { status: 500 })
    }

    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .insert({
        usuario_id:        userId,
        slug,
        nombre,
        rubro,
        telefono:          telefono || null,
        email:             email || null,
        direccion:         direccion || null,
        descripcion:       descripcion || null,
        duracion_cita_min: duracion_cita_min ?? 30,
        dias_anticipacion: dias_anticipacion ?? 30,
        horarios:          horarios || null,
        requiere_sena:     requiere_sena ?? false,
        monto_sena:        requiere_sena && monto_sena ? parseFloat(monto_sena) : null,
        alias_mp:          alias_mp || null,
        cbu:               cbu || null,
        titular_cuenta:    titular_cuenta || null,
        activo:            true,
      })
      .select()
      .single()

    if (negocioError || !negocio) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al crear el negocio' }, { status: 500 })
    }

    const { error: configError } = await supabase
      .from('negocio_agente_config')
      .insert({
        negocio_id:           negocio.id,
        prompt_personalidad:  prompt_personalidad || 'Sos el asistente virtual del negocio.',
        tono:                 tono || 'amigable',
        idioma:               idioma || 'es',
        mensaje_bienvenida:   mensaje_bienvenida || '¡Hola! ¿En qué puedo ayudarte?',
        mensaje_confirmacion: mensaje_confirmacion || 'Tu cita está confirmada para el {{fecha}} a las {{hora}}hs.',
        mensaje_recordatorio: mensaje_recordatorio || 'Te recordamos tu cita mañana {{fecha}} a las {{hora}}hs.',
        mensaje_cancelacion:  mensaje_cancelacion || 'Tu cita del {{fecha}} fue cancelada.',
      })

    if (configError) console.error('Error creando config agente:', configError)

    const faqsValidas = (faqs ?? [])
      .filter((f: any) => f.pregunta?.trim() && f.respuesta?.trim())
      .map((f: any, i: number) => ({
        negocio_id: negocio.id,
        pregunta:   f.pregunta.trim(),
        respuesta:  f.respuesta.trim(),
        orden:      i,
        activo:     true,
      }))

    if (faqsValidas.length > 0) {
      const { error: faqError } = await supabase.from('negocio_faqs').insert(faqsValidas)
      if (faqError) console.error('Error creando FAQs:', faqError)
    }

    return NextResponse.json({
      ok:            true,
      negocio_id:    negocio.id,
      slug:          negocio.slug,
      webhook_token: negocio.webhook_token,
    })
  } catch (error) {
    console.error('Error en /api/negocios/crear:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Crear `negocios/actualizar/route.ts`**

```bash
mkdir -p src/app/api/negocios/actualizar
```

Contenido de `src/app/api/negocios/actualizar/route.ts`:

```typescript
// src/app/api/negocios/actualizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('rol').eq('id', user.id).single()

    const body = await req.json()

    // Superadmin puede actualizar cualquier negocio (para toggle de recetas, etc.)
    if (usuario?.rol === 'superadmin') {
      const { negocio_id, ...campos } = body
      if (!negocio_id) return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
      const admin = createAdminClient()
      const { error } = await admin.from('negocios').update(campos).eq('id', negocio_id)
      if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Negocio solo actualiza su propio registro
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios').select('id').eq('usuario_id', user.id).single()

    if (negocioError || !negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const {
      nombre, telefono, direccion,
      foto_perfil_url, logo_url, sello_url, firma_url,
      horarios,
      precio_consulta, requiere_sena, monto_sena,
      cbu, alias_mp,
      acepta_agendamientos,
    } = body

    const { error: updateError } = await supabase
      .from('negocios')
      .update({
        nombre,
        telefono:            telefono        || null,
        direccion:           direccion       || null,
        foto_perfil_url:     foto_perfil_url ?? null,
        logo_url:            logo_url        ?? null,
        sello_url:           sello_url       ?? null,
        firma_url:           firma_url       ?? null,
        horarios:            horarios        ?? null,
        precio_consulta:     precio_consulta ?? null,
        requiere_sena:       requiere_sena   ?? false,
        monto_sena:          monto_sena      ?? null,
        cbu:                 cbu             ?? null,
        alias_mp:            alias_mp        ?? null,
        acepta_agendamientos: acepta_agendamientos ?? true,
      })
      .eq('id', negocio.id)

    if (updateError) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en /api/negocios/actualizar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Crear `negocios/publico/route.ts`**

```bash
mkdir -p src/app/api/negocios/publico
```

Contenido de `src/app/api/negocios/publico/route.ts`:

```typescript
// src/app/api/negocios/publico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: negocio } = await supabase
      .from('negocios')
      .select(`
        id,
        slug,
        nombre,
        rubro,
        direccion,
        telefono,
        activo,
        negocio_agente_config (
          mensaje_bienvenida
        )
      `)
      .eq('slug', slug)
      .eq('activo', true)
      .single()

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const config = (negocio.negocio_agente_config as any[])?.[0]

    return NextResponse.json({
      id:                 negocio.id,
      slug:               negocio.slug,
      nombre:             negocio.nombre,
      rubro:              negocio.rubro,
      direccion:          negocio.direccion,
      telefono:           negocio.telefono,
      mensaje_bienvenida: config?.mensaje_bienvenida ?? null,
    })
  } catch (error) {
    console.error('Error en /api/negocios/publico:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Eliminar el directorio viejo**

```bash
rm -rf src/app/api/medicos
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/negocios/ src/app/api/medicos/
git commit -m "feat: API routes negocios (reemplaza /api/medicos)"
```

---

## Task 4: Rutas API — clientes y sesión

**Files:**
- Modify: `src/app/api/clientes/registrar/route.ts`
- Create: `src/app/api/sesion/cliente/route.ts`
- Delete: `src/app/api/sesion/paciente/`

- [ ] **Step 1: Actualizar `src/app/api/clientes/registrar/route.ts`**

Este archivo ya existe (lo creamos antes), pero usa `medico_id` y `paciente_id` en lugar de `negocio_id` y `cliente_id`. Reemplazar con:

```typescript
// src/app/api/clientes/registrar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { negocio_id?: string; nombre?: string; apellido?: string; celular?: string; chat_id?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { negocio_id, nombre, celular, chat_id, apellido } = body

    if (!negocio_id || !nombre || !celular) {
      return NextResponse.json({ error: 'Faltan campos requeridos: negocio_id, nombre, celular' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: cliente, error: errCliente } = await supabase
      .from('clientes')
      .upsert(
        { negocio_id, nombre, apellido: apellido ?? null, celular },
        { onConflict: 'negocio_id,celular', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (errCliente || !cliente) {
      return NextResponse.json({ error: 'Error al registrar cliente' }, { status: 500 })
    }

    if (chat_id) {
      await supabase
        .from('chat_sessions')
        .upsert(
          { chat_id, cliente_id: cliente.id, negocio_id, updated_at: new Date().toISOString() },
          { onConflict: 'chat_id' }
        )
    }

    return NextResponse.json({ ok: true, cliente_id: cliente.id })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Crear `src/app/api/sesion/cliente/route.ts`**

```bash
mkdir -p src/app/api/sesion/cliente
```

Contenido:

```typescript
// src/app/api/sesion/cliente/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const chat_id = req.nextUrl.searchParams.get('chat_id')
  if (!chat_id) return NextResponse.json({ cliente_id: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('chat_sessions')
    .select('cliente_id')
    .eq('chat_id', chat_id)
    .single()

  return NextResponse.json({ cliente_id: data?.cliente_id ?? null })
}
```

- [ ] **Step 3: Eliminar el directorio viejo**

```bash
rm -rf src/app/api/sesion/paciente
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/clientes/ src/app/api/sesion/
git commit -m "feat: API routes clientes y sesión (reemplaza pacientes/sesion-paciente)"
```

---

## Task 5: Rutas API — queries internas

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/citas/crear/route.ts`
- Modify: `src/app/api/citas/disponibles/route.ts`
- Modify: `src/app/api/campanias/enviar/route.ts`
- Modify: `src/app/api/push/enviar/route.ts`
- Modify: `src/app/api/recetas/crear/route.ts`

- [ ] **Step 1: Actualizar `src/app/api/chat/route.ts`**

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL ?? 'https://n8n.simplificia.com.ar/webhook/chat-medico'

export async function POST(req: NextRequest) {
  try {
    const { negocio_id, chat_id, message, image_url } = await req.json()

    if (!negocio_id || !chat_id || (!message?.trim() && !image_url)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: negocio } = await supabase
      .from('negocios')
      .select('webhook_token, activo')
      .eq('id', negocio_id)
      .single()

    if (!negocio || !negocio.activo) {
      return NextResponse.json({ error: 'Negocio no encontrado o inactivo' }, { status: 404 })
    }

    const mensajeFinal = [
      message?.trim() ?? '',
      image_url ? `[Imagen adjunta: ${image_url}]` : '',
    ].filter(Boolean).join('\n')

    const n8nResponse = await fetch(N8N_BASE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_token: negocio.webhook_token,
        chat_id,
        message: mensajeFinal,
      }),
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('Error desde n8n:', errorText)
      return NextResponse.json(
        { error: 'El asistente no está disponible en este momento' },
        { status: 503 }
      )
    }

    const data = await n8nResponse.json()

    let resolvedClienteId: string | null = data.cliente_id ?? null

    if (!resolvedClienteId && data.celular && negocio_id) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('id')
        .eq('negocio_id', negocio_id)
        .eq('celular', data.celular)
        .single()
      resolvedClienteId = cli?.id ?? null
    }

    if (resolvedClienteId && chat_id) {
      await supabase.from('chat_sessions').upsert(
        { chat_id, cliente_id: resolvedClienteId, negocio_id, updated_at: new Date().toISOString() },
        { onConflict: 'chat_id' }
      )
    }

    return NextResponse.json({
      response:   data.response || data.output || 'Sin respuesta del asistente',
      action:     data.action ?? null,
      cliente_id: resolvedClienteId,
      chat_id,
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Actualizar `src/app/api/citas/crear/route.ts`**

```typescript
// src/app/api/citas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, parseISO } from 'date-fns'
import type { EstadoCita } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { negocio_id?: string; cliente_id?: string; chat_id?: string; fecha?: string; hora?: string; metodo_pago?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { negocio_id, cliente_id: clienteIdBody, chat_id, fecha, hora, metodo_pago } = body

    if (!negocio_id || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let cliente_id = clienteIdBody ?? null
    if (!cliente_id && chat_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('cliente_id')
        .eq('chat_id', chat_id)
        .eq('negocio_id', negocio_id)
        .single()
      cliente_id = session?.cliente_id ?? null
    }

    if (!cliente_id) {
      return NextResponse.json({ error: 'No se pudo identificar al cliente' }, { status: 400 })
    }

    const { data: negocio, error: errNegocio } = await supabase
      .from('negocios')
      .select('id, duracion_cita_min, cbu, alias_mp, precio_consulta, requiere_sena, monto_sena')
      .eq('id', negocio_id)
      .single()

    if (errNegocio) {
      if (errNegocio.code === 'PGRST116') {
        return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error al buscar negocio' }, { status: 500 })
    }
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const duracion: number = negocio.duracion_cita_min ?? 30

    const fechaInicioLocal = `${fecha}T${hora}:00`
    const fechaInicio = parseISO(`${fechaInicioLocal}-03:00`)
    const fechaFin    = addMinutes(fechaInicio, duracion)

    const fechaInicioISO = fechaInicio.toISOString()
    const fechaFinISO    = fechaFin.toISOString()

    const { data: conflicto, error: errConflicto } = await supabase
      .from('citas')
      .select('id')
      .eq('negocio_id', negocio_id)
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fechaFinISO)
      .gt('fecha_fin', fechaInicioISO)
      .limit(1)
      .maybeSingle()

    if (errConflicto) {
      return NextResponse.json({ error: 'Error al verificar disponibilidad' }, { status: 500 })
    }
    if (conflicto) {
      return NextResponse.json({ error: 'Ese turno ya fue tomado' }, { status: 409 })
    }

    const estado: EstadoCita = 'pendiente'
    const { data: cita, error: errCita } = await supabase
      .from('citas')
      .insert({
        negocio_id,
        cliente_id,
        fecha_inicio:  fechaInicioISO,
        fecha_fin:     fechaFinISO,
        estado,
        metodo_pago:   metodo_pago ?? 'sin_pago',
      })
      .select('id')
      .single()

    if (errCita || !cita) {
      return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
    }

    const { count } = await supabase
      .from('citas')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', cliente_id)
      .neq('estado', 'cancelada')
    await supabase
      .from('clientes')
      .update({ total_citas: count ?? 1, ultima_cita_at: fechaInicioISO })
      .eq('id', cliente_id)

    return NextResponse.json({
      ok:              true,
      cita_id:         cita.id,
      fecha_inicio:    fechaInicioISO,
      fecha_fin:       fechaFinISO,
      cbu:             negocio.cbu             ?? null,
      alias_mp:        negocio.alias_mp        ?? null,
      precio_consulta: negocio.precio_consulta ?? null,
      requiere_sena:   negocio.requiere_sena   ?? false,
      monto_sena:      negocio.monto_sena      ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Actualizar `src/app/api/citas/disponibles/route.ts`**

Editar el archivo. Cambiar solo las líneas que referencian `medico_id` / `medicos`:

Línea que tiene `const medicoId = req.nextUrl.searchParams.get('medico_id')` → cambiar a:
```typescript
const negocioId = req.nextUrl.searchParams.get('negocio_id')
```

Luego todas las referencias a `medicoId` → `negocioId`, y:
```typescript
// Buscar en tabla negocios
const { data: negocio } = await supabase
  .from('negocios')
  // ...resto igual pero usando negocioId
```

Y la query de citas existentes: `.eq('negocio_id', negocioId)` en lugar de `medico_id`.

También el parámetro de validación:
```typescript
if (!negocioId) {
  return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
}
```

- [ ] **Step 4: Actualizar `src/app/api/campanias/enviar/route.ts`**

Cambiar el destructuring del body:
```typescript
const { titulo, contenido, segmento, negocio_id } = await req.json()
if (!titulo || !contenido || !negocio_id) { ... }
```

Luego todas las ocurrencias de `medico_id` → `negocio_id` en las queries.  
Las queries a `pacientes` → `clientes` y `paciente_id` → `cliente_id` en push_subscriptions.

También en la tabla `mensajes_promo`, la columna es ahora `negocio_id`.

- [ ] **Step 5: Actualizar `src/app/api/push/enviar/route.ts`**

Cambiar destructuring:
```typescript
const { cliente_id, negocio_id, titulo, cuerpo, tipo, cita_id, url } = await req.json()
```

Queries a `push_subscriptions`: `.eq('cliente_id', cliente_id)` en lugar de `paciente_id`.  
Logs en `notificaciones_log` (si existe): usar `negocio_id` y `cliente_id`.

- [ ] **Step 6: Actualizar `src/app/api/recetas/crear/route.ts`**

Cambiar todas las referencias:
- `.from('medicos')` → `.from('negocios')`
- `medico_id` → `negocio_id`
- `paciente_id` → `cliente_id`
- `.from('pacientes')` → `.from('clientes')`

- [ ] **Step 7: Commit**

```bash
git add src/app/api/
git commit -m "feat: actualizar queries internas de API routes (negocio/cliente)"
```

---

## Task 6: Auth, middleware y sidebar

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Actualizar `src/middleware.ts`**

Cambiar la línea:
```typescript
const dest = usuario?.rol === 'superadmin' ? '/admin' : '/dashboard'
```
Queda igual — el middleware no chequea `'medico'` explícitamente, solo usa el fallback `/dashboard`. No hay cambios necesarios aquí.

Verificar que no haya referencias a `'medico'` en el archivo. Si las hay, reemplazar por `'negocio'`.

- [ ] **Step 2: Actualizar `src/app/dashboard/layout.tsx`**

Reemplazar el contenido con:

```typescript
// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let nombreNegocio = user.email ?? ''

  if (usuario.rol === 'negocio') {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('nombre')
      .eq('usuario_id', user.id)
      .single()
    if (negocio) nombreNegocio = negocio.nombre
  } else {
    nombreNegocio = 'Super Admin'
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={usuario.rol} nombreNegocio={nombreNegocio} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar `src/components/layout/Sidebar.tsx`**

Reemplazar el contenido con:

```typescript
// src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import {
  LayoutDashboard, Calendar, Users, Megaphone,
  Settings, LogOut, ChevronLeft, ChevronRight,
  UserCog, Briefcase,
} from 'lucide-react'

interface NavItem {
  label:        string
  href:         string
  icon:         React.ReactNode
  adminOnly?:   boolean
  clienteOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',          icon: <LayoutDashboard size={18} /> },
  { label: 'Calendario',   href: '/dashboard/calendario', icon: <Calendar size={18} />,   clienteOnly: true },
  { label: 'Clientes',     href: '/dashboard/clientes',  icon: <Users size={18} />,       clienteOnly: true },
  { label: 'Campañas',     href: '/dashboard/campanias', icon: <Megaphone size={18} />,   clienteOnly: true },
  { label: 'Negocios',     href: '/admin/negocios',      icon: <Briefcase size={18} />,   adminOnly: true },
  { label: 'Configuración', href: '/dashboard/config',   icon: <Settings size={18} /> },
]

interface SidebarProps {
  rol:           string
  nombreNegocio?: string
}

export default function Sidebar({ rol, nombreNegocio }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAdmin = rol === 'superadmin'
  const items = NAV_ITEMS
    .filter(item => !item.adminOnly  || isAdmin)
    .filter(item => !item.clienteOnly || !isAdmin)
    .map(item =>
      item.href === '/dashboard' && isAdmin
        ? { ...item, href: '/admin' }
        : item
    )

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
      style={{ background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>

      {/* Logo */}
      <div className={clsx(
        'flex items-center h-16 px-4 flex-shrink-0',
        collapsed ? 'justify-center' : 'justify-between'
      )}
        style={{ borderBottom: '1px solid #3D3D3B' }}>
        {!collapsed && (
          <Image src="/logo.png" alt="SimplificIA" width={130} height={34} priority />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#7AB619')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Negocio info */}
      {!collapsed && nombreNegocio && (
        <div className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <p className="text-xs" style={{ color: '#5C5C59' }}>
            {isAdmin ? 'Administrador' : 'Negocio'}
          </p>
          <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>
            {nombreNegocio}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(item => {
          const dashboardRoot = item.href === '/dashboard' || item.href === '/admin'
          const active = pathname === item.href ||
            (!dashboardRoot && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                collapsed && 'justify-center px-2',
              )}
              style={{
                color:      active ? '#7AB619' : '#9A9A96',
                background: active ? 'rgba(122,182,25,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(122,182,25,0.05)'; e.currentTarget.style.color = '#F0F0EE' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9A96' } }}
              title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.adminOnly && (
                <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 font-semibold"
                  style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                  Admin
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid #3D3D3B' }}>
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
            collapsed && 'justify-center px-2'
          )}
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5C59'; e.currentTarget.style.background = 'transparent' }}
          title={collapsed ? 'Cerrar sesión' : undefined}>
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/app/dashboard/layout.tsx src/app/login/page.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: auth y sidebar — negocio reemplaza medico, Clientes reemplaza Pacientes"
```

---

## Task 7: Dashboard — páginas principales

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/calendario/page.tsx`
- Modify: `src/app/dashboard/calendario/CalendarioCliente.tsx`
- Modify: `src/app/dashboard/campanias/page.tsx`
- Modify: `src/app/dashboard/campanias/CampaniasCliente.tsx`
- Modify: `src/app/dashboard/config/page.tsx`
- Modify: `src/app/dashboard/config/ConfigCliente.tsx`

- [ ] **Step 1: Actualizar `src/app/dashboard/page.tsx`**

Buscar y reemplazar en el archivo:
- `.from('medicos')` → `.from('negocios')`
- `'nombre_completo'` → `'nombre'`  
- `'especialidad'` → `'rubro'`
- `medicoId` → `negocioId`
- `medico_id` → `negocio_id`
- `paciente_id` → `cliente_id`
- `.from('pacientes')` → `.from('clientes')`
- `usuario.rol === 'medico'` → `usuario.rol === 'negocio'`

- [ ] **Step 2: Actualizar `src/app/dashboard/calendario/page.tsx`**

Buscar y reemplazar:
- `.from('medicos')` → `.from('negocios')`
- `medico_id` → `negocio_id`
- `usuario.rol === 'medico'` → `usuario.rol === 'negocio'`
- `nombre_completo` → `nombre`
- `medicoId` → `negocioId`

- [ ] **Step 3: Actualizar `src/app/dashboard/calendario/CalendarioCliente.tsx`**

Buscar y reemplazar:
- Props: `medicoId` → `negocioId`
- Queries o fetch calls que usan `medico_id` → `negocio_id`
- Labels en UI: "Médico" → "Negocio"

- [ ] **Step 4: Actualizar `src/app/dashboard/campanias/page.tsx`**

```typescript
// src/app/dashboard/campanias/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CampaniasCliente from './CampaniasCliente'

export default async function CampaniasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let negocioId: string | null = null
  if (usuario.rol === 'negocio') {
    const { data: negocio } = await supabase
      .from('negocios').select('id').eq('usuario_id', user.id).single()
    if (negocio) negocioId = negocio.id
  }

  const { data: campanias } = await supabase
    .from('mensajes_promo')
    .select('*')
    .eq('negocio_id', negocioId ?? '')
    .order('created_at', { ascending: false })
    .limit(20)

  const { count: totalConPush } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('negocio_id', negocioId ?? '')
    .eq('activo', true)

  return (
    <CampaniasCliente
      campaniasIniciales={campanias ?? []}
      negocioId={negocioId}
      totalConPush={totalConPush ?? 0}
    />
  )
}
```

- [ ] **Step 5: Actualizar `src/app/dashboard/campanias/CampaniasCliente.tsx`**

Cambiar prop `medicoId` → `negocioId` en la firma del componente y todos sus usos.  
Cambiar el label `'Todos los pacientes'` en `SEGMENTO_LABEL` → `'Todos los clientes'`.  
Cambiar `'Inactivos hace'` labels si mencionan "pacientes" → "clientes".

- [ ] **Step 6: Actualizar `src/app/dashboard/config/page.tsx`**

Buscar y reemplazar:
- `.from('medicos')` → `.from('negocios')`
- `medico_id` → `negocio_id`
- `nombre_completo` → `nombre`
- `especialidad` → `rubro`
- `usuario.rol === 'medico'` → `usuario.rol === 'negocio'`
- `medicoId` → `negocioId`

- [ ] **Step 7: Actualizar `src/app/dashboard/config/ConfigCliente.tsx`**

- Import: `Medico` → `Negocio`, `HorarioDia` stays the same
- Prop type: `negocio: Negocio` en lugar de `medico: Medico`
- Todas las referencias a `medico.` → `negocio.`
- `nombre_completo` → `nombre`
- `especialidad` → `rubro`
- El `fetch` a `/api/medicos/actualizar` → `/api/negocios/actualizar`
- El ícono `Stethoscope` puede cambiarse por `Briefcase` de lucide-react

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/
git commit -m "feat: dashboard pages — negocio/cliente reemplaza medico/paciente"
```

---

## Task 8: Dashboard — clientes (ex pacientes)

**Files:**
- Create: `src/app/dashboard/clientes/page.tsx`
- Create: `src/app/dashboard/clientes/ClientesCliente.tsx`
- Create: `src/app/dashboard/clientes/RecetaModal.tsx`
- Delete: `src/app/dashboard/pacientes/`

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p src/app/dashboard/clientes
```

- [ ] **Step 2: Crear `src/app/dashboard/clientes/page.tsx`**

```typescript
// src/app/dashboard/clientes/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientesCliente from './ClientesCliente'

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let negocioId: string | null = null
  let negocioInfo: {
    id: string; nombre: string; rubro: string
    logo_url: string | null; sello_url: string | null
    firma_url: string | null; habilitar_recetas: boolean
  } | null = null

  if (usuario.rol === 'negocio') {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, nombre, rubro, logo_url, sello_url, firma_url, habilitar_recetas')
      .eq('usuario_id', user.id)
      .single()
    if (negocio) {
      negocioId = negocio.id
      negocioInfo = {
        id:               negocio.id,
        nombre:           negocio.nombre,
        rubro:            negocio.rubro,
        logo_url:         negocio.logo_url,
        sello_url:        negocio.sello_url,
        firma_url:        negocio.firma_url,
        habilitar_recetas: negocio.habilitar_recetas,
      }
    }
  }

  const query = supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (negocioId) query.eq('negocio_id', negocioId)

  const { data: clientes } = await query

  return (
    <ClientesCliente
      clientesIniciales={clientes ?? []}
      negocioId={negocioId}
      negocioInfo={negocioInfo}
    />
  )
}
```

- [ ] **Step 3: Crear `src/app/dashboard/clientes/ClientesCliente.tsx`**

Copiar el contenido de `src/app/dashboard/pacientes/PacientesCliente.tsx` y aplicar estos cambios:

1. Renombrar el archivo y el componente: `PacientesCliente` → `ClientesCliente`
2. Import: `type { Paciente }` → `type { Cliente }`
3. Import: `RecetaModal` queda igual (el archivo se copia al nuevo dir)
4. Interfaz `MedicoInfo` → `NegocioInfo`, con campos `nombre`, `rubro` en lugar de `nombre`, `especialidad`. Agregar `habilitar_recetas: boolean`
5. Props del componente principal: `pacientesIniciales` → `clientesIniciales`, `medicoId` → `negocioId`, `medicoInfo` → `negocioInfo`
6. Estados internos: `pacienteModal` → `clienteModal`, `recetaPaciente` → `recetaCliente`
7. En `ModalPaciente` (renombrar a `ModalCliente`): el botón "Nueva receta" solo renderiza si `negocioInfo?.habilitar_recetas === true`:
   ```tsx
   {negocioInfo?.habilitar_recetas && (
     <button onClick={onNuevaReceta} ...>
       <FileText size={15} />
       Nueva receta
     </button>
   )}
   ```
8. Label en stats: `"Con push"`, `"Sin push"` quedan igual. Header: `"Pacientes"` → `"Clientes"`
9. En el filtro de búsqueda: `"Buscar por nombre, celular o email..."` queda igual
10. En `FilaPaciente` (renombrar a `FilaCliente`): sin cambios de lógica, solo tipos

- [ ] **Step 4: Copiar `RecetaModal.tsx`**

```bash
cp src/app/dashboard/pacientes/RecetaModal.tsx src/app/dashboard/clientes/RecetaModal.tsx
```

En el archivo copiado, cambiar:
- Import: `type { Paciente, Medico }` → `type { Cliente, Negocio }` (o los nombres que use)
- Prop types internos: `paciente: Paciente` → `cliente: Cliente`, `medico: Medico` → `negocio: Negocio`
- Accesos a `medico.nombre_completo` → `negocio.nombre`
- Accesos a `medico.especialidad` → `negocio.rubro`
- Fetch a `/api/recetas/crear` → ya usa la ruta correcta (no cambia)

- [ ] **Step 5: Eliminar el directorio viejo**

```bash
rm -rf src/app/dashboard/pacientes
```

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/clientes/ src/app/dashboard/pacientes/
git commit -m "feat: /dashboard/clientes (reemplaza /dashboard/pacientes), recetas con flag habilitar_recetas"
```

---

## Task 9: Admin panel — negocios

**Files:**
- Create: `src/app/admin/negocios/page.tsx`
- Create: `src/app/admin/negocios/nuevo/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Delete: `src/app/admin/medicos/`

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p src/app/admin/negocios/nuevo
```

- [ ] **Step 2: Crear `src/app/admin/negocios/page.tsx`**

```typescript
// src/app/admin/negocios/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Briefcase, CheckCircle, XCircle, FileText } from 'lucide-react'

// Este es un Server Component que carga datos y pasa a cliente
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminNegociosPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: negocios } = await supabase
    .from('negocios')
    .select('id, nombre, rubro, activo, habilitar_recetas, created_at, webhook_token')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Negocios</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            {negocios?.length ?? 0} negocios registrados en la plataforma
          </p>
        </div>
        <Link href="/admin/negocios/nuevo"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <Plus size={16} />
          Nuevo negocio
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        {!negocios || negocios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Briefcase size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm mb-4" style={{ color: '#5C5C59' }}>
              No hay negocios registrados
            </p>
            <Link href="/admin/negocios/nuevo"
              className="text-sm font-medium" style={{ color: '#7AB619' }}>
              Agregar el primero →
            </Link>
          </div>
        ) : (
          negocios.map(negocio => (
            <NegocioRow key={negocio.id} negocio={negocio} />
          ))
        )}
      </div>
    </div>
  )
}

function NegocioRow({ negocio }: {
  negocio: {
    id: string; nombre: string; rubro: string; activo: boolean
    habilitar_recetas: boolean; webhook_token: string
  }
}) {
  const [recetas, setRecetas] = useState(negocio.habilitar_recetas)
  const [pending, startTransition] = useTransition()

  async function toggleRecetas() {
    const nuevoValor = !recetas
    setRecetas(nuevoValor)
    const res = await fetch('/api/negocios/actualizar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocio_id: negocio.id, habilitar_recetas: nuevoValor }),
    })
    if (!res.ok) setRecetas(!nuevoValor) // revert on error
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: '1px solid #3D3D3B' }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
        <Briefcase size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{negocio.nombre}</p>
        <p className="text-xs" style={{ color: '#5C5C59' }}>{negocio.rubro}</p>
      </div>
      <div className="flex items-center gap-3">
        {negocio.activo ? (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#7AB619' }}>
            <CheckCircle size={13} /> Activo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
            <XCircle size={13} /> Inactivo
          </span>
        )}

        {/* Toggle recetas — solo superadmin ve esto */}
        <button
          onClick={() => startTransition(toggleRecetas)}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all"
          style={{
            background: recetas ? 'rgba(139,92,246,0.15)' : 'rgba(92,92,89,0.15)',
            color:      recetas ? '#8B5CF6' : '#5C5C59',
            border:     `1px solid ${recetas ? 'rgba(139,92,246,0.3)' : '#3D3D3B'}`,
          }}>
          <FileText size={12} />
          {recetas ? 'Recetas ✓' : 'Recetas'}
        </button>

        <code className="text-[10px] rounded px-2 py-1"
          style={{ background: '#20201F', color: '#5C5C59' }}>
          {negocio.webhook_token.slice(0, 12)}...
        </code>
      </div>
    </div>
  )
}
```

**Nota:** Este componente tiene partes client (`NegocioRow` con useState) y server (`AdminNegociosPage`). En Next.js App Router, para que funcione, `NegocioRow` debe estar en un archivo separado `'use client'` o el componente principal debe ser client. La solución más simple: convertir la página entera en client y hacer el fetch en `useEffect`, o extraer `NegocioRow` a un archivo separado `NegocioRow.tsx` con `'use client'`. 

Separar en dos archivos:

**`src/app/admin/negocios/NegocioRow.tsx`** (nuevo, client):
```typescript
'use client'

import { useState, useTransition } from 'react'
import { Briefcase, CheckCircle, XCircle, FileText } from 'lucide-react'

export function NegocioRow({ negocio }: {
  negocio: {
    id: string; nombre: string; rubro: string; activo: boolean
    habilitar_recetas: boolean; webhook_token: string
  }
}) {
  const [recetas, setRecetas] = useState(negocio.habilitar_recetas)
  const [pending, startTransition] = useTransition()

  function toggleRecetas() {
    const nuevoValor = !recetas
    setRecetas(nuevoValor)
    startTransition(async () => {
      const res = await fetch('/api/negocios/actualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocio_id: negocio.id, habilitar_recetas: nuevoValor }),
      })
      if (!res.ok) setRecetas(!nuevoValor)
    })
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: '1px solid #3D3D3B' }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
        <Briefcase size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{negocio.nombre}</p>
        <p className="text-xs" style={{ color: '#5C5C59' }}>{negocio.rubro}</p>
      </div>
      <div className="flex items-center gap-3">
        {negocio.activo ? (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#7AB619' }}>
            <CheckCircle size={13} /> Activo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
            <XCircle size={13} /> Inactivo
          </span>
        )}
        <button
          onClick={toggleRecetas}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all"
          style={{
            background: recetas ? 'rgba(139,92,246,0.15)' : 'rgba(92,92,89,0.15)',
            color:      recetas ? '#8B5CF6' : '#5C5C59',
            border:     `1px solid ${recetas ? 'rgba(139,92,246,0.3)' : '#3D3D3B'}`,
          }}>
          <FileText size={12} />
          {recetas ? 'Recetas ✓' : 'Recetas'}
        </button>
        <code className="text-[10px] rounded px-2 py-1"
          style={{ background: '#20201F', color: '#5C5C59' }}>
          {negocio.webhook_token.slice(0, 12)}...
        </code>
      </div>
    </div>
  )
}
```

**`src/app/admin/negocios/page.tsx`** (server, simplificado):
```typescript
// src/app/admin/negocios/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import { NegocioRow } from './NegocioRow'

export default async function AdminNegociosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: negocios } = await supabase
    .from('negocios')
    .select('id, nombre, rubro, activo, habilitar_recetas, created_at, webhook_token')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Negocios</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            {negocios?.length ?? 0} negocios registrados en la plataforma
          </p>
        </div>
        <Link href="/admin/negocios/nuevo"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <Plus size={16} />
          Nuevo negocio
        </Link>
      </div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        {!negocios || negocios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Briefcase size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm mb-4" style={{ color: '#5C5C59' }}>No hay negocios registrados</p>
            <Link href="/admin/negocios/nuevo" className="text-sm font-medium" style={{ color: '#7AB619' }}>
              Agregar el primero →
            </Link>
          </div>
        ) : (
          negocios.map(negocio => <NegocioRow key={negocio.id} negocio={negocio} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/app/admin/negocios/nuevo/page.tsx`**

Copiar el contenido de `src/app/admin/medicos/nuevo/page.tsx` y cambiar:
- `nombre_completo` → `nombre`
- `especialidad` → `rubro`
- El label del campo: `"Especialidad"` → `"Rubro"`
- `"Nombre completo"` → `"Nombre del negocio"`
- El fetch: `'/api/medicos/crear'` → `'/api/negocios/crear'`
- El texto `"Error al crear el médico"` → `"Error al crear el negocio"`
- Títulos y labels: `"Nuevo médico"` → `"Nuevo negocio"`, `"Médico"` → `"Negocio"`
- Ícono `Stethoscope` → `Briefcase`
- `medico_id` en la respuesta → `negocio_id`

- [ ] **Step 4: Actualizar `src/app/admin/page.tsx`**

Buscar y reemplazar en el archivo:
- `.from('medicos')` → `.from('negocios')`
- `medico_id` → `negocio_id`
- `nombre_completo` → `nombre`
- `especialidad` → `rubro`
- Labels en UI: `"médicos"` → `"negocios"`, `"Total clientes"` etc. quedan genéricos

- [ ] **Step 5: Eliminar el directorio viejo**

```bash
rm -rf src/app/admin/medicos
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat: admin panel — negocios con toggle de recetas (reemplaza medicos)"
```

---

## Task 10: n8n workflow

**Files:** n8n workflow `BGj5q2FB9UhqOhMS` (via REST API)

El workflow tiene 4 nodos que referencian las tablas viejas de Supabase. Después de la migración de DB, las URLs a `/rest/v1/medicos` y `/rest/v1/pacientes` ya no funcionan.

- [ ] **Step 1: Descargar el workflow actual**

```bash
N8N_KEY="<API_KEY>"
curl -s "https://n8n.simplificia.com.ar/api/v1/workflows/BGj5q2FB9UhqOhMS" \
  -H "X-N8N-API-KEY: $N8N_KEY" > /tmp/workflow.json
echo "Descargado: $(wc -c < /tmp/workflow.json) bytes"
```

- [ ] **Step 2: Aplicar los cambios via script Python**

```python
# Guardar como /tmp/patch_n8n.py y ejecutar con: python3 /tmp/patch_n8n.py
import json

with open('/tmp/workflow.json') as f:
    wf = json.load(f)

for node in wf['nodes']:

    # ── "Cargar config médico" ──────────────────────────────────────────
    if node['name'] == 'Cargar config médico':
        old_url = node['parameters']['url']
        new_url = old_url \
            .replace('/rest/v1/medicos?', '/rest/v1/negocios?') \
            .replace('medico_agente_config(', 'negocio_agente_config(') \
            .replace('medico_faqs(', 'negocio_faqs(') \
            .replace('nombre_completo,', 'nombre,') \
            .replace('especialidad,', 'rubro,')
        node['parameters']['url'] = new_url
        print('✓ Cargar config médico — URL actualizada')

    # ── "Construir prompt" ──────────────────────────────────────────────
    if node['name'] == 'Construir prompt':
        code = node['parameters']['jsCode']
        code = code.replace('medico.medico_agente_config', 'negocio.negocio_agente_config')
        code = code.replace('medico.medico_faqs', 'negocio.negocio_faqs')
        code = code.replace('medico.nombre_completo', 'negocio.nombre')
        code = code.replace('medico.especialidad', 'negocio.rubro')
        code = code.replace("medico.id + '\\\"'\\n  + '&celular", 
                            "negocio.id + '\\\"'\\n  + '&celular")  # dentro del fetch
        # URL fetch interna: /rest/v1/pacientes → /rest/v1/clientes
        code = code.replace('/rest/v1/pacientes?medico_id=eq.', '/rest/v1/clientes?negocio_id=eq.')
        # Variable local "medico" → "negocio" donde es el objeto del negocio
        code = code.replace('const medico = Array.isArray(raw) ? raw[0] : raw;',
                            'const negocio = Array.isArray(raw) ? raw[0] : raw;')
        code = code.replace('const config = (medico.medico_agente_config', 
                            'const config = (negocio.negocio_agente_config')
        code = code.replace('const faqs = (medico.medico_faqs',
                            'const faqs = (negocio.negocio_faqs')
        code = code.replace('const horarios = medico.horarios', 
                            'const horarios = negocio.horarios')
        # Texto del prompt
        code = code.replace('- Médico: ${medico.nombre_completo}',
                            '- Negocio: ${negocio.nombre}')
        code = code.replace('- Especialidad: ${medico.especialidad}',
                            '- Rubro: ${negocio.rubro}')
        code = code.replace('`medico_id=eq.${encodeURIComponent(medico.id)}',
                            '`negocio_id=eq.${encodeURIComponent(negocio.id)}')
        # Output del nodo
        code = code.replace('medico_id: medico.id,', 'negocio_id: negocio.id,')
        code = code.replace('medico_nombre: medico.nombre_completo,',
                            'negocio_nombre: negocio.nombre,')
        code = code.replace('requiere_sena: medico.requiere_sena,',
                            'requiere_sena: negocio.requiere_sena,')
        code = code.replace('monto_sena: medico.monto_sena,',
                            'monto_sena: negocio.monto_sena,')
        code = code.replace('mensaje_bienvenida: config.mensaje_bienvenida',
                            'mensaje_bienvenida: config.mensaje_bienvenida')
        code = code.replace('INFORMACIÓN DEL CONSULTORIO:', 'INFORMACIÓN DEL NEGOCIO:')
        node['parameters']['jsCode'] = code
        print('✓ Construir prompt — código actualizado')

    # ── "Buscar paciente" ───────────────────────────────────────────────
    if node['name'] == 'Buscar paciente':
        node['name'] = 'Buscar cliente'
        old_url = node['parameters']['url']
        new_url = old_url \
            .replace('/rest/v1/pacientes?medico_id=eq.', '/rest/v1/clientes?negocio_id=eq.') \
            .replace("$('Construir prompt').item.json.medico_id",
                     "$('Construir prompt').item.json.negocio_id")
        node['parameters']['url'] = new_url
        if 'toolDescription' in node['parameters']:
            node['parameters']['toolDescription'] = node['parameters']['toolDescription'] \
                .replace('paciente', 'cliente').replace('Paciente', 'Cliente')
        print('✓ Buscar paciente → Buscar cliente — URL actualizada')

    # ── "Registrar paciente" ────────────────────────────────────────────
    if node['name'] == 'Registrar paciente':
        node['name'] = 'Registrar cliente'
        body = node['parameters']['jsonBody']
        body = body.replace('medico_id:', 'negocio_id:') \
                   .replace("$('Construir prompt').item.json.medico_id",
                            "$('Construir prompt').item.json.negocio_id")
        node['parameters']['jsonBody'] = body
        if 'toolDescription' in node['parameters']:
            node['parameters']['toolDescription'] = node['parameters']['toolDescription'] \
                .replace('paciente', 'cliente').replace('Paciente', 'Cliente')
        print('✓ Registrar paciente → Registrar cliente — body actualizado')

    # ── "Responder al chat" ─────────────────────────────────────────────
    if node['name'] == 'Responder al chat':
        body = node['parameters']['responseBody']
        body = body.replace('paciente_id:', 'cliente_id:') \
                   .replace("$('Construir prompt').item.json.paciente_id",
                            "$('Construir prompt').item.json.cliente_id")
        node['parameters']['responseBody'] = body
        print('✓ Responder al chat — campo paciente_id → cliente_id')

# Connections: si algún nodo se renombró, actualizar las connections
conns = wf.get('connections', {})
if 'Buscar paciente' in conns:
    conns['Buscar cliente'] = conns.pop('Buscar paciente')
if 'Registrar paciente' in conns:
    conns['Registrar cliente'] = conns.pop('Registrar paciente')

# Limpiar references en connections que apuntan a los nodos renombrados
for src, targets in conns.items():
    for output_type, outputs in targets.items():
        for output in outputs:
            for conn in output:
                if conn.get('node') == 'Buscar paciente':
                    conn['node'] = 'Buscar cliente'
                if conn.get('node') == 'Registrar paciente':
                    conn['node'] = 'Registrar cliente'

payload = {
    'name':        wf['name'],
    'nodes':       wf['nodes'],
    'connections': wf['connections'],
    'settings':    {'executionOrder': 'v1'},
    'staticData':  wf.get('staticData'),
}

with open('/tmp/workflow_updated.json', 'w') as f:
    json.dump(payload, f)

print('\n✓ Payload guardado en /tmp/workflow_updated.json')
```

Ejecutar:
```bash
python3 /tmp/patch_n8n.py
```

- [ ] **Step 3: Subir el workflow actualizado**

```bash
N8N_KEY="<API_KEY>"
curl -s -X PUT "https://n8n.simplificia.com.ar/api/v1/workflows/BGj5q2FB9UhqOhMS" \
  -H "X-N8N-API-KEY: $N8N_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/workflow_updated.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'id' in d:
    print('SUCCESS — workflow actualizado')
else:
    print('ERROR:', json.dumps(d)[:300])
"
```

- [ ] **Step 4: Verificar en la UI de n8n**

Abrir `https://n8n.simplificia.com.ar` → workflow `BGj5q2FB9UhqOhMS`.  
Verificar que los nodos se llaman "Buscar cliente" y "Registrar cliente".  
En "Cargar config médico", la URL debe apuntar a `/rest/v1/negocios`.  
En "Construir prompt", el output debe tener `negocio_id` en lugar de `medico_id`.

- [ ] **Step 5: Test end-to-end**

1. Abrir la PWA de un negocio (`/app/[slug]`)
2. Iniciar chat
3. Verificar que el agente responde correctamente
4. Dar un número de celular y agendar una cita
5. Verificar en Supabase Studio que la cita se creó en la tabla `citas` con `negocio_id` y `cliente_id`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: n8n workflow actualizado — negocios/clientes (era medicos/pacientes)"
```

---

## Verificación final

Después de todas las tasks, hacer un check general:

```bash
npm run lint
npm run build
```

Resolver cualquier error de TypeScript que quede (principalmente imports que aún usan `Medico`, `Paciente`, `MedicoAgenteConfig`).

Navegar manualmente:
1. Login como `negocio` → debe entrar a `/dashboard`
2. Sidebar muestra "Clientes" (no "Pacientes"), "Negocios" no aparece
3. Login como `superadmin` → debe entrar a `/admin`
4. Sidebar muestra "Negocios" (no "Médicos"), Calendario/Clientes/Campañas no aparecen
5. `/admin/negocios` → lista de negocios con toggle de Recetas
6. Chat de un negocio → flujo completo de agendamiento funciona
