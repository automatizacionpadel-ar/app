# Design: Edge Function `send-reminders`

**Date:** 2026-05-21  
**Sprint:** 6  
**Status:** Approved

---

## Overview

Una única Supabase Edge Function paramétrica que envía recordatorios de citas via web-push VAPID. pg_cron la invoca dos veces con distintos parámetros para cubrir los intervalos de 24h y 2h antes de cada cita.

---

## Architecture

### Endpoint

`POST /functions/v1/send-reminders`

Body: `{ "hours_before": 24 | 2 }`

### Flow

```
pg_cron (cada hora)     → send-reminders { hours_before: 24 }
pg_cron (cada 30 min)   → send-reminders { hours_before: 2  }
```

### Processing Logic

1. Recibe `hours_before` del body
2. Consulta `citas` donde:
   - `fecha_inicio` BETWEEN `(now + hours_before - 30min)` AND `(now + hours_before + 30min)`
   - `estado` IN `('pendiente', 'confirmada')`
   - `recordatorio_24h_enviado = false` (si hours_before = 24) o `recordatorio_2h_enviado = false` (si hours_before = 2)
   - JOIN `pacientes` WHERE `push_activo = true`
   - JOIN `medicos`
   - JOIN `medico_agente_config` para obtener `mensaje_recordatorio`
3. Procesa en batches de 50 para no exceder el límite de 50s de Supabase Edge Functions
4. Para cada cita:
   - Renderiza `mensaje_recordatorio` con variables: `{nombre}`, `{hora}`, `{fecha}`, `{especialidad}`
   - Obtiene `push_subscriptions` activas del paciente
   - Envía notificación push via web-push VAPID
   - Marca `recordatorio_Xh_enviado = true` en la cita
   - Inserta registro en `notificaciones_log`
   - Si una subscription retorna 410/404, la marca como `activo = false`
5. Retorna `{ procesadas, enviadas, fallidas }`

### Extensibility

Para agregar un nuevo intervalo (ej: 1h, 48h):
1. Agregar columna `recordatorio_Xh_enviado boolean DEFAULT false` en `citas`
2. Agregar un nuevo `cron.schedule` con el body correspondiente

No se requiere cambiar código de la Edge Function.

---

## VAPID Keys

- Generadas una vez con `web-push generate-vapid-keys`
- Almacenadas como **Supabase Secrets** (nunca en el repo):
  - `VAPID_EMAIL` — `mailto:contacto@simplificia.com.ar`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
- La `VAPID_PUBLIC_KEY` también se usa en el frontend como `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `.env.local`
- Son las mismas keys que usa `/api/push/enviar/route.ts` — no generar keys separadas

---

## pg_cron Jobs

Definidos en `supabase/migrations/20260521_pg_cron_reminders.sql`:

```sql
-- Prerequisito: configurar los app settings en Supabase (una sola vez vía SQL Editor):
-- ALTER DATABASE postgres SET app.supabase_url = 'https://[project-ref].supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = '[service-role-key]';

-- Recordatorio 24h: se ejecuta cada hora en punto
SELECT cron.schedule(
  'reminders-24h',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"hours_before": 24}'::jsonb
  ) $$
);

-- Recordatorio 2h: se ejecuta cada 30 minutos
SELECT cron.schedule(
  'reminders-2h',
  '*/30 * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"hours_before": 2}'::jsonb
  ) $$
);
```

---

## File Structure

```
supabase/
  functions/
    send-reminders/
      index.ts                              ← Edge Function principal
  migrations/
    20260521_pg_cron_reminders.sql          ← cron jobs
  .env.local                               ← VAPID keys para desarrollo local (gitignored)
```

---

## Message Template

`medico_agente_config.mensaje_recordatorio` puede usar estas variables:

| Variable        | Valor                                  |
|-----------------|----------------------------------------|
| `{nombre}`      | `pacientes.nombre`                     |
| `{hora}`        | hora de `citas.fecha_inicio` (HH:mm)   |
| `{fecha}`       | fecha de `citas.fecha_inicio` (dd/MM)  |
| `{especialidad}`| `medicos.especialidad`                 |

Ejemplo: `"Hola {nombre}, recordá tu cita de {especialidad} el {fecha} a las {hora}."`

---

## Error Handling

| Escenario                              | Comportamiento                                     |
|----------------------------------------|----------------------------------------------------|
| `hours_before` ausente o inválido      | Retorna 400                                        |
| Sin citas en la ventana               | Retorna 200 con `{ procesadas: 0 }`                |
| Push subscription expirada (410/404)  | Marca `activo = false`, continúa con las demás     |
| Error al enviar push                  | Registra en `notificaciones_log` con `exitoso: false`, continúa |
| Timeout de Edge Function              | El batch limita a 50 citas por ejecución; la próxima ejecución procesa el resto (los flags previenen duplicados) |

---

## Security

- La función solo es invocable con el `service_role_key` de Supabase en el header `Authorization`
- Las VAPID keys nunca se exponen en el cliente
- La función corre en el contexto de Supabase con acceso directo a la DB via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (inyectados automáticamente por Supabase en Edge Functions)
