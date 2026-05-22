# send-reminders Edge Function Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la Edge Function `send-reminders` de Supabase que envía push notifications de recordatorio de citas (24h y 2h antes) via VAPID, invocada por pg_cron.

**Architecture:** Una única función paramétrica que recibe `hours_before` (24 o 2), consulta citas en una ventana de ±30 minutos, renderiza el template de mensaje personalizado por médico, y envía push notifications via web-push. Los flags `recordatorio_24h_enviado` / `recordatorio_2h_enviado` en la tabla `citas` previenen duplicados. pg_cron la invoca via `pg_net` con parámetros distintos para cada intervalo.

**Tech Stack:** Supabase Edge Functions (Deno), web-push (npm:web-push@3.6.7), @supabase/supabase-js@2, Deno test runner, pg_cron + pg_net.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `supabase/functions/send-reminders/helpers.ts` | Crear | Funciones puras: template rendering, field selector, date formatting |
| `supabase/functions/send-reminders/index.test.ts` | Crear | Tests unitarios de helpers con Deno test |
| `supabase/functions/send-reminders/index.ts` | Crear | Edge Function principal: query, push send, logging |
| `supabase/migrations/20260521_pg_cron_reminders.sql` | Crear | pg_cron jobs para 24h y 2h |
| `supabase/.env.local` | Crear | VAPID keys para desarrollo local (gitignored) |
| `.gitignore` | Crear | Ignorar `supabase/.env.local` |

---

## Task 1: Generar VAPID Keys

**Files:**
- Create: `supabase/.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Verificar que web-push está instalado**

```bash
ls node_modules/web-push
```

Expected: directorio listado. Si no existe: `npm install web-push`

- [ ] **Step 2: Generar las VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Expected output (ejemplo — las tuyas serán distintas):
```
=======================================

Public Key:
BNHWx4kd_example_public_key_base64url

Private Key:
abc123_example_private_key_base64url

=======================================
```

Copiá ambas keys, las necesitás en los pasos siguientes.

- [ ] **Step 3: Crear `supabase/.env.local` con las keys generadas**

Reemplazá los valores con los generados en el paso anterior:

```bash
# supabase/.env.local
VAPID_EMAIL=mailto:contacto@simplificia.com.ar
VAPID_PUBLIC_KEY=<tu-public-key-generada>
VAPID_PRIVATE_KEY=<tu-private-key-generada>
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<tu-local-service-role-key>
```

La `SUPABASE_SERVICE_ROLE_KEY` local la encontrás en el output de `supabase start` o en `supabase status`.

- [ ] **Step 4: Crear `.gitignore` en la raíz del proyecto**

```
# Dependencies
node_modules/

# Next.js
.next/
out/

# Environment
.env
.env.local
.env*.local

# Supabase local secrets
supabase/.env.local

# OS
.DS_Store
```

- [ ] **Step 5: Agregar la VAPID_PUBLIC_KEY al `.env.local` del frontend**

El frontend ya usa `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `src/hooks/usePushNotifications.ts` y en `src/app/api/push/enviar/route.ts`. Asegurate de que las keys del frontend coincidan con las generadas:

```bash
# .env.local (en la raíz del proyecto, para Next.js)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<misma-public-key-generada>
VAPID_EMAIL=mailto:contacto@simplificia.com.ar
VAPID_PRIVATE_KEY=<misma-private-key-generada>
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore with supabase/.env.local excluded"
```

---

## Task 2: Crear helpers.ts y sus tests

**Files:**
- Create: `supabase/functions/send-reminders/helpers.ts`
- Create: `supabase/functions/send-reminders/index.test.ts`

- [ ] **Step 1: Crear el directorio de la función**

```bash
mkdir -p supabase/functions/send-reminders
```

- [ ] **Step 2: Escribir los tests que van a fallar**

Crear `supabase/functions/send-reminders/index.test.ts`:

```typescript
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts"
import {
  renderTemplate,
  getReminderField,
  formatTime,
  formatDate,
  buildPayload,
} from "./helpers.ts"

Deno.test("renderTemplate: reemplaza variables conocidas", () => {
  const result = renderTemplate(
    "Hola {nombre}, tu cita de {especialidad} es el {fecha} a las {hora}.",
    { nombre: "Juan", especialidad: "Clínica", fecha: "15/06", hora: "10:00" }
  )
  assertEquals(result, "Hola Juan, tu cita de Clínica es el 15/06 a las 10:00.")
})

Deno.test("renderTemplate: preserva variables desconocidas sin romper", () => {
  const result = renderTemplate("Hola {nombre} {apellido}", { nombre: "Ana" })
  assertEquals(result, "Hola Ana {apellido}")
})

Deno.test("renderTemplate: maneja template sin variables", () => {
  const result = renderTemplate("Recordá tu cita.", {})
  assertEquals(result, "Recordá tu cita.")
})

Deno.test("getReminderField: retorna campo correcto para 24h", () => {
  assertEquals(getReminderField(24), "recordatorio_24h_enviado")
})

Deno.test("getReminderField: retorna campo correcto para 2h", () => {
  assertEquals(getReminderField(2), "recordatorio_2h_enviado")
})

Deno.test("getReminderField: lanza error para valor no soportado", () => {
  assertThrows(
    () => getReminderField(12),
    Error,
    "hours_before no soportado: 12"
  )
})

Deno.test("formatTime: formatea hora en timezone Argentina", () => {
  // 2026-06-15T13:00:00Z = 10:00 AM Argentina (UTC-3)
  const result = formatTime("2026-06-15T13:00:00Z")
  assertEquals(result, "10:00")
})

Deno.test("formatDate: formatea fecha en formato dd/MM", () => {
  const result = formatDate("2026-06-15T13:00:00Z")
  assertEquals(result, "15/06")
})

Deno.test("buildPayload: construye JSON con estructura correcta", () => {
  const payload = JSON.parse(buildPayload("Tu cita es mañana", "cita-123"))
  assertEquals(payload.title, "Recordatorio de cita")
  assertEquals(payload.body, "Tu cita es mañana")
  assertEquals(payload.data.tag, "recordatorio")
  assertEquals(payload.data.cita_id, "cita-123")
  assertEquals(payload.icon, "/logo.png")
})
```

- [ ] **Step 3: Ejecutar los tests — deben fallar**

```bash
deno test supabase/functions/send-reminders/index.test.ts
```

Expected: error "Cannot resolve module './helpers.ts'"

- [ ] **Step 4: Crear `supabase/functions/send-reminders/helpers.ts`**

```typescript
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export function getReminderField(
  hoursBefore: number
): "recordatorio_24h_enviado" | "recordatorio_2h_enviado" {
  if (hoursBefore === 24) return "recordatorio_24h_enviado"
  if (hoursBefore === 2) return "recordatorio_2h_enviado"
  throw new Error(`hours_before no soportado: ${hoursBefore}`)
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export function buildPayload(messageBody: string, citaId: string): string {
  return JSON.stringify({
    title: "Recordatorio de cita",
    body: messageBody,
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      tag: "recordatorio",
      cita_id: citaId,
    },
  })
}
```

- [ ] **Step 5: Ejecutar los tests — deben pasar**

```bash
deno test supabase/functions/send-reminders/index.test.ts
```

Expected:
```
running 9 tests from ./supabase/functions/send-reminders/index.test.ts
renderTemplate: reemplaza variables conocidas ... ok (Xms)
renderTemplate: preserva variables desconocidas sin romper ... ok (Xms)
renderTemplate: maneja template sin variables ... ok (Xms)
getReminderField: retorna campo correcto para 24h ... ok (Xms)
getReminderField: retorna campo correcto para 2h ... ok (Xms)
getReminderField: lanza error para valor no soportado ... ok (Xms)
formatTime: formatea hora en timezone Argentina ... ok (Xms)
formatDate: formatea fecha en formato dd/MM ... ok (Xms)
buildPayload: construye JSON con estructura correcta ... ok (Xms)

ok | 9 passed | 0 failed
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-reminders/helpers.ts supabase/functions/send-reminders/index.test.ts
git commit -m "feat: add send-reminders helpers with unit tests"
```

---

## Task 3: Crear la Edge Function principal

**Files:**
- Create: `supabase/functions/send-reminders/index.ts`

- [ ] **Step 1: Crear `supabase/functions/send-reminders/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import {
  buildPayload,
  formatDate,
  formatTime,
  getReminderField,
  renderTemplate,
} from "./helpers.ts"

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let hours_before: number
  try {
    const body = await req.json()
    hours_before = body.hours_before
  } catch {
    return json({ error: "Body JSON inválido" }, 400)
  }

  if (hours_before !== 24 && hours_before !== 2) {
    return json({ error: "hours_before debe ser 24 o 2" }, 400)
  }

  webpush.setVapidDetails(
    Deno.env.get("VAPID_EMAIL")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  )

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const reminderField = getReminderField(hours_before)
  const now = new Date()
  const windowStart = new Date(
    now.getTime() + (hours_before * 60 - 30) * 60 * 1000
  ).toISOString()
  const windowEnd = new Date(
    now.getTime() + (hours_before * 60 + 30) * 60 * 1000
  ).toISOString()

  const { data: citas, error: citasError } = await supabase
    .from("citas")
    .select(`
      id,
      medico_id,
      paciente_id,
      fecha_inicio,
      pacientes!inner ( id, nombre, push_activo ),
      medicos!inner ( especialidad ),
      medico_agente_config ( mensaje_recordatorio )
    `)
    .gte("fecha_inicio", windowStart)
    .lte("fecha_inicio", windowEnd)
    .in("estado", ["pendiente", "confirmada"])
    .eq(reminderField, false)
    .limit(50)

  if (citasError) {
    console.error("Error consultando citas:", citasError)
    return json({ error: "Error consultando citas" }, 500)
  }

  // Filtrar pacientes con push activo (no soportado directamente en el filtro de FK)
  const citasConPush = (citas ?? []).filter(
    (c: any) => c.pacientes?.push_activo === true
  )

  let procesadas = 0
  let enviadas = 0
  let fallidas = 0

  for (const cita of citasConPush) {
    const template =
      cita.medico_agente_config?.mensaje_recordatorio ??
      "Recordá tu cita de {especialidad} el {fecha} a las {hora}, {nombre}."

    const messageBody = renderTemplate(template, {
      nombre: cita.pacientes.nombre,
      hora: formatTime(cita.fecha_inicio),
      fecha: formatDate(cita.fecha_inicio),
      especialidad: cita.medicos.especialidad,
    })

    const payload = buildPayload(messageBody, cita.id)

    // Obtener subscriptions activas del paciente
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("paciente_id", cita.paciente_id)
      .eq("activo", true)

    if (!subscriptions || subscriptions.length === 0) {
      procesadas++
      continue
    }

    const resultados = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(sub.subscription, payload)
      )
    )

    const expiradas: string[] = []
    resultados.forEach((result, i) => {
      if (result.status === "fulfilled") {
        enviadas++
      } else {
        fallidas++
        const status = (result.reason as any)?.statusCode
        if (status === 410 || status === 404) expiradas.push(subscriptions[i].id)
      }
    })

    if (expiradas.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ activo: false })
        .in("id", expiradas)
    }

    // Marcar recordatorio como enviado
    await supabase
      .from("citas")
      .update({ [reminderField]: true })
      .eq("id", cita.id)

    // Log de cada intento
    await supabase.from("notificaciones_log").insert(
      subscriptions.map((sub: any, i: number) => ({
        medico_id: cita.medico_id,
        paciente_id: cita.paciente_id,
        push_subscription_id: sub.id,
        cita_id: cita.id,
        tipo: "recordatorio",
        titulo: "Recordatorio de cita",
        cuerpo: messageBody,
        exitoso: resultados[i].status === "fulfilled",
        error_mensaje:
          resultados[i].status === "rejected"
            ? String((resultados[i] as PromiseRejectedResult).reason)
            : null,
      }))
    )

    procesadas++
  }

  return json({ procesadas, enviadas, fallidas })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
```

- [ ] **Step 2: Volver a correr los tests para confirmar que helpers siguen ok**

```bash
deno test supabase/functions/send-reminders/index.test.ts
```

Expected: `ok | 9 passed | 0 failed`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-reminders/index.ts
git commit -m "feat: add send-reminders edge function"
```

---

## Task 4: Test de integración local

**Prerequisito:** Tener Supabase CLI instalado (`brew install supabase/tap/supabase`) y el proyecto de Supabase iniciado (`supabase start`).

- [ ] **Step 1: Inicializar el proyecto Supabase (solo la primera vez)**

```bash
supabase init
```

Expected: crea `supabase/config.toml`. Si ya existe, salta este paso.

- [ ] **Step 2: Verificar que Supabase CLI está instalado**

```bash
supabase --version
```

Expected: `supabase version X.X.X`. Si no está: `brew install supabase/tap/supabase`

- [ ] **Step 2: Iniciar Supabase localmente (si no está corriendo)**

```bash
supabase start
```

Expected: URLs e keys para el proyecto local. Copiar `service_role key` para usarla en el `.env.local`.

- [ ] **Step 3: Servir la función localmente**

```bash
supabase functions serve send-reminders --env-file supabase/.env.local
```

Expected: `Serving functions on http://localhost:54321/functions/v1/`

- [ ] **Step 4: Test — request con hours_before inválido**

En otra terminal:

```bash
curl -i --request POST 'http://localhost:54321/functions/v1/send-reminders' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0' \
  --header 'Content-Type: application/json' \
  --data '{"hours_before": 99}'
```

Expected: `HTTP/1.1 400` con `{"error":"hours_before debe ser 24 o 2"}`

- [ ] **Step 5: Test — request válido (sin citas en la ventana temporal)**

```bash
curl -i --request POST 'http://localhost:54321/functions/v1/send-reminders' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0' \
  --header 'Content-Type: application/json' \
  --data '{"hours_before": 24}'
```

Expected: `HTTP/1.1 200` con `{"procesadas":0,"enviadas":0,"fallidas":0}` (o con valores reales si hay citas en la DB local con fecha_inicio en el próximo día).

---

## Task 5: Crear migración pg_cron

**Files:**
- Create: `supabase/migrations/20260521_pg_cron_reminders.sql`

- [ ] **Step 1: Crear el directorio de migraciones**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Crear `supabase/migrations/20260521_pg_cron_reminders.sql`**

```sql
-- Prerequisito: configurar app settings con los valores reales de producción.
-- Ejecutar esto una sola vez en el SQL Editor de Supabase (no se puede hacer via migración):
--   ALTER DATABASE postgres SET app.supabase_url = 'https://[project-ref].supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '[service-role-key]';
--
-- Verificar que pg_cron y pg_net están habilitados en el proyecto Supabase
-- (Database > Extensions > pg_cron y pg_net).

-- Eliminar jobs existentes si los hay (idempotente)
DO $$ BEGIN PERFORM cron.unschedule('reminders-24h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('reminders-2h');  EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Recordatorio 24h: se ejecuta cada hora en punto
SELECT cron.schedule(
  'reminders-24h',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url        := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers    := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body       := '{"hours_before": 24}'::jsonb
  )
  $$
);

-- Recordatorio 2h: se ejecuta cada 30 minutos
SELECT cron.schedule(
  'reminders-2h',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url        := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers    := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body       := '{"hours_before": 2}'::jsonb
  )
  $$
);
```

- [ ] **Step 3: Verificar que la migración puede aplicarse localmente**

```bash
supabase db push --local
```

Expected: `Applying migration 20260521_pg_cron_reminders.sql...` sin errores. Si falla con "pg_cron not found", habilitar la extensión primero en el SQL Editor local: `CREATE EXTENSION IF NOT EXISTS pg_cron;`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521_pg_cron_reminders.sql
git commit -m "feat: add pg_cron jobs for 24h and 2h appointment reminders"
```

---

## Task 6: Deploy a Supabase producción

- [ ] **Step 1: Linkear el proyecto Supabase (si no está linkeado)**

```bash
supabase link --project-ref <tu-project-ref>
```

El `project-ref` se encuentra en la URL del dashboard de Supabase: `https://app.supabase.com/project/[project-ref]`.

- [ ] **Step 2: Configurar los secrets VAPID en Supabase**

```bash
supabase secrets set VAPID_EMAIL=mailto:contacto@simplificia.com.ar
supabase secrets set VAPID_PUBLIC_KEY=<tu-public-key>
supabase secrets set VAPID_PRIVATE_KEY=<tu-private-key>
```

Verificar que quedaron guardados:

```bash
supabase secrets list
```

Expected: los tres secrets listados.

- [ ] **Step 3: Deploy de la función**

```bash
supabase functions deploy send-reminders
```

Expected:
```
Deploying Function send-reminders (version X)
Done: https://[project-ref].supabase.co/functions/v1/send-reminders
```

- [ ] **Step 4: Test smoke en producción**

```bash
curl -i --request POST \
  'https://[project-ref].supabase.co/functions/v1/send-reminders' \
  --header 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"hours_before": 24}'
```

Expected: `HTTP/1.1 200` con `{"procesadas":N,"enviadas":N,"fallidas":0}`

- [ ] **Step 5: Configurar app settings en SQL Editor de producción**

Ejecutar en el SQL Editor del dashboard de Supabase (no es una migración, es configuración de instancia):

```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://[project-ref].supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '[tu-service-role-key]';
```

- [ ] **Step 6: Aplicar la migración de pg_cron en producción**

```bash
supabase db push
```

Expected: `Applying migration 20260521_pg_cron_reminders.sql...` sin errores.

- [ ] **Step 7: Verificar que los cron jobs quedaron registrados**

Ejecutar en el SQL Editor de producción:

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('reminders-24h', 'reminders-2h');
```

Expected:
```
jobname        | schedule    | active
---------------|-------------|-------
reminders-24h  | 0 * * * *   | t
reminders-2h   | */30 * * * *| t
```

- [ ] **Step 8: Commit final**

```bash
git add .
git commit -m "feat: deploy send-reminders edge function with pg_cron integration"
```
