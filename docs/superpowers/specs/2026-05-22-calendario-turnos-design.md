# Calendario de Turnos en Chat — Design Spec

## Goal

Show an interactive date+time picker inside the patient chat when the AI agent detects the patient wants to book an appointment. The patient selects a date chip, a time slot chip, fills in name and phone, and confirms — creating a `citas` record directly in Supabase without going through n8n.

## Architecture

n8n signals the frontend via a structured `action` field in its response. The chat page detects `action === "show_calendar"` and renders a `CalendarioTurnos` component inline in the chat. A new API endpoint computes available slots from the doctor's schedule and existing appointments. A second endpoint creates the appointment. Both endpoints are Next.js API routes calling Supabase directly.

**Tech Stack:** Next.js 14 App Router, Supabase, React, TypeScript, Tailwind, date-fns

---

## Trigger: n8n Signal

The `/api/chat` route already returns `data.response`. n8n extends its "Respuesta final" node to optionally include `action: "show_calendar"` when the agent decides to show the calendar:

```json
{
  "response": "¡Perfecto! Elegí una fecha disponible:",
  "action": "show_calendar"
}
```

The chat page checks `data.action === "show_calendar"` after each AI response. If true, it appends a special message of type `"calendar"` to the `mensajes` array instead of (or alongside) the text bubble.

No changes required to `/api/chat/route.ts` — it already forwards the full n8n response body.

---

## API: GET /api/citas/disponibles

**File:** `src/app/api/citas/disponibles/route.ts`

**Request:** `GET /api/citas/disponibles?medico_id=UUID`

**Logic:**
1. Fetch `horarios` and `duracion_cita_min` from `medicos` table
2. For each of the next 14 calendar days:
   - Check if that weekday is active in `horarios`
   - If active, generate all slots from `inicio` to `fin` with `duracion_cita_min` step
3. Fetch existing `citas` for this medico in the next 14 days with status not `cancelada`
4. Remove slots that overlap with existing citas
5. Only include days with at least one free slot

**Weekday mapping** (horarios keys → JS getDay()):
```
lunes→1, martes→2, miercoles→3, jueves→4, viernes→5, sabado→6, domingo→0
```

**Response:**
```json
[
  {
    "fecha": "2026-05-22",
    "label": "Vie 22/5",
    "slots": ["09:00", "09:30", "10:00", "11:00"]
  }
]
```

**Error:** 400 if `medico_id` missing, 404 if medico not found, 500 on error.

`export const dynamic = 'force-dynamic'`

---

## API: POST /api/citas/crear

**File:** `src/app/api/citas/crear/route.ts`

**Request body:**
```json
{
  "medico_id": "UUID",
  "nombre": "María López",
  "telefono": "1155556666",
  "fecha": "2026-05-22",
  "hora": "09:00"
}
```

**Logic:**
1. Compute `fecha_inicio` = `${fecha}T${hora}:00` (Argentina timezone: -03:00)
2. Fetch `duracion_cita_min` from medico
3. Compute `fecha_fin` = `fecha_inicio + duracion_cita_min`
4. Find or create `pacientes` record by `telefono` + `medico_id`:
   - SELECT by `telefono` and `medico_id`
   - If not found, INSERT with `nombre`, `telefono`, `medico_id`
5. INSERT into `citas`: `medico_id`, `paciente_id`, `fecha_inicio`, `fecha_fin`, `estado: 'pendiente'`
6. Return `{ ok: true, cita_id, fecha_inicio, fecha_fin }`

**Error:** 400 on missing fields, 409 if slot already taken (check before insert), 500 on error.

---

## Component: CalendarioTurnos

**File:** `src/components/chat/CalendarioTurnos.tsx`

**Props:**
```typescript
interface Props {
  medicoId: string
  onConfirmed: (label: string) => void  // called with human-readable confirmation
}
```

**Internal state:**
- `dias: DiaDisponible[]` — fetched from `/api/citas/disponibles`
- `diaSeleccionado: DiaDisponible | null`
- `horaSeleccionada: string | null`
- `nombre: string`
- `telefono: string`
- `loading: boolean`
- `error: string | null`
- `step: 'fecha' | 'hora' | 'confirm'`

**Render (3 steps, all inline — no modal):**

**Step 1 — fecha:** Horizontal scrollable row of date chips. Selected chip uses `#7AB619` background, unselected use `rgba(122,182,25,0.15)` border.

**Step 2 — hora:** Grid of time chips for the selected day. Tapping a chip advances to step 3.

**Step 3 — confirm:** Two inputs (nombre, telefono) + "Confirmar turno" button. On submit: POST to `/api/citas/crear`, on success call `onConfirmed("Vie 22/5 a las 09:00")`.

**Styling:** Dark theme consistent with chat (`#2A2A29` background, `#3D3D3B` border, `#7AB619` accent, `#F0F0EE` text). Wrapped in a container with the same border-radius as chat bubbles.

---

## Chat Page Changes

**File:** `src/app/app/[slug]/chat/page.tsx`

**Mensaje type extension:**
```typescript
interface Mensaje {
  id:        string
  role:      'user' | 'assistant' | 'calendar'
  content:   string
  timestamp: Date
}
```

**After API call** in `enviarMensaje`, check response:
```typescript
if (data.action === 'show_calendar') {
  setMensajes(prev => [...prev, {
    id:        crypto.randomUUID(),
    role:      'calendar',
    content:   data.response || '¡Elegí una fecha disponible!',
    timestamp: new Date(),
  }])
} else {
  // existing text bubble logic
}
```

**In the render**, when `msg.role === 'calendar'`:
- Render the assistant text bubble (using `msg.content`)
- Below it, render `<CalendarioTurnos medicoId={medicoId!} onConfirmed={...} />`
- `onConfirmed` appends a confirmation bubble: `"✓ Turno confirmado: Vie 22/5 a las 09:00. ¡Te esperamos!"`

---

## Files

| Action | File |
|---|---|
| Create | `src/app/api/citas/disponibles/route.ts` |
| Create | `src/app/api/citas/crear/route.ts` |
| Create | `src/components/chat/CalendarioTurnos.tsx` |
| Modify | `src/app/app/[slug]/chat/page.tsx` |

---

## Error Handling

- `disponibles` returns empty array → component shows "No hay turnos disponibles en los próximos 14 días"
- `crear` returns 409 → show "Ese turno ya fue tomado, elegí otro" and reset to step 1
- Network error → show "Error de conexión. Intentá de nuevo." inline in the component
- `nombre` or `telefono` empty on submit → inline validation, don't call API

---

## Out of Scope

- Cancellation flow
- Rescheduling
- Email/push confirmation after booking (handled separately by send-reminders)
- Authentication of the patient (no login required for booking)
