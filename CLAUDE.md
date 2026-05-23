# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
```

No test suite — verify changes manually via the dev server or Supabase Studio.

## Architecture Overview

SimplificIA is a SaaS platform for medical practices. It has two distinct panels and a patient-facing PWA.

### Two separate panels

**`/dashboard/*`** — doctor panel. Protected by middleware + layout auth check. Requires `rol = 'medico'`.

**`/admin/*`** — superadmin panel. Protected by `src/app/admin/layout.tsx` which hard-redirects non-superadmins to `/dashboard`. The sidebar hides `clienteOnly` items (Pacientes, Calendario, Campañas) from superadmins via the `clienteOnly` flag on `NavItem`.

Login redirect (`src/app/login/page.tsx` and `src/middleware.ts`) checks the `usuarios.rol` column after auth and routes to `/admin` or `/dashboard` accordingly.

### Patient-facing PWA

**`/app/[slug]`** — landing page for a doctor's practice, served at their unique slug. Shows push notification opt-in.  
**`/app/[slug]/chat`** — AI chat interface. Messages go to `/api/chat` → proxied to n8n webhook with the doctor's `webhook_token`. The n8n workflow identifies the patient by phone number, manages conversation memory, and returns a response + optional `action` field (e.g., `show_calendar`).

The chat session is identified by a UUID stored in `localStorage` as `simplificia_chat_id`.

### Supabase clients — two flavors

- `createClient()` in `src/lib/supabase/server.ts` — uses the anon key with cookie-based auth. Used in Server Components and layouts.
- `createAdminClient()` — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS. **Required** in any API route that reads/writes across tenants (e.g., `/api/chat`, `/api/push/enviar`, `/api/recetas/crear`). Never use the anon key for cross-tenant queries — RLS will block them silently.

### Page pattern

Every dashboard page is split:
- `page.tsx` — async Server Component: auth check, Supabase queries, passes data as props
- `*Cliente.tsx` — `'use client'` component: UI state, modals, interactions

### Push notifications

Web Push via VAPID. The flow:
1. Patient opts in at `/app/[slug]` → `usePushNotifications` hook subscribes and saves to `push_subscriptions` table
2. Doctor triggers push via `/api/push/enviar` (uses `web-push` lib with `VAPID_PRIVATE_KEY`)
3. Service worker at `public/sw.js` handles incoming push, shows notification, opens `data.url` on click (used to deliver PDF prescriptions)

### PDF prescriptions (RecetaModal)

Generated client-side with `jsPDF`, uploaded to the `recetas` Supabase Storage bucket, then sent to the patient via push notification with `url: publicUrl`. The PDF includes the doctor's logo, sello, and firma images fetched via `imgToBase64()`.

### n8n AI agent workflow

The n8n workflow (`BGj5q2FB9UhqOhMS`) handles the AI chat. Critical architecture detail: **patient lookup happens deterministically in the "Construir prompt" Code node** via `fetch()` to Supabase using the service_role key — not via the AI agent tool — because GPT-4o-mini was hallucinating tool calls. When the current message contains a phone number (`\b(\d{7,15})\b`), the patient is pre-fetched and injected into the system prompt as a fact.

The n8n API key and workflow ID are managed directly (not in env vars). When editing the workflow via n8n REST API, build the PUT payload with only `{ name, nodes, connections, settings, staticData }` — extra fields cause 400 errors.

## Design system

Dark theme, no CSS frameworks beyond Tailwind for layout. All colors are inline styles:

| Token | Value | Usage |
|---|---|---|
| Background card | `#2A2A29` | Cards, modals, sidebar |
| Background deep | `#20201F` | Page background, inputs |
| Border | `#3D3D3B` | All borders |
| Text primary | `#F0F0EE` | Headings, values |
| Text muted | `#5C5C59` | Labels, subtitles |
| Text mid | `#9A9A96` | Secondary text |
| Green | `#7AB619` | Brand, CTAs, icons |
| Purple | `#8B5CF6` | Recetas feature |
| Blue | `#3B82F6` | Secondary stats |

Content areas use `w-[85%] mx-auto` (not `max-w-*`).

## Environment variables

| Variable | Used where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Both clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server anon client |
| `SUPABASE_SERVICE_ROLE_KEY` | `createAdminClient()` — server only |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push subscription in browser |
| `VAPID_PRIVATE_KEY` | `/api/push/enviar` — server only |
| `VAPID_EMAIL` | VAPID identification |
| `N8N_WEBHOOK_URL` | `/api/chat` proxy (optional, has default) |

## Database schema (key tables)

- `usuarios` — auth link with `rol: 'superadmin' | 'medico'`
- `medicos` — doctor profile, config, `webhook_token`, `slug`, `logo_url`, `sello_url`, `firma_url`
- `medico_agente_config` — AI agent personality/prompts (1-to-1 with medico)
- `medico_faqs` — FAQ entries shown to patients via AI
- `pacientes` — linked to `medico_id`, unique constraint on `(medico_id, celular)`
- `citas` — appointments with estado, pago, and reminder flags
- `push_subscriptions` — VAPID subscriptions per patient device
- `recetas` — PDF prescription records; files in `recetas` Storage bucket
- `suscripciones` — SaaS billing records per doctor (for superadmin MRR tracking)
- `notificaciones_log` — log of all push sends

Migrations live in `supabase/migrations/`. Apply with `supabase db push` or via Supabase Studio.
