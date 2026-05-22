# Calendario de Turnos en Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an interactive date+time picker inside the patient chat when n8n signals `action: "show_calendar"`, letting patients book appointments directly via Supabase.

**Architecture:** n8n returns `action: "show_calendar"` in the chat API response. The chat page detects this and renders a `CalendarioTurnos` component inline. Two new API routes handle available slots computation and appointment creation directly against Supabase.

**Tech Stack:** Next.js 14 App Router, Supabase, React, TypeScript, Tailwind, date-fns

---

## File Map

| Action | File |
|---|---|
| Create | `src/app/api/citas/disponibles/route.ts` |
| Create | `src/app/api/citas/crear/route.ts` |
| Create | `src/components/chat/CalendarioTurnos.tsx` |
| Modify | `src/app/app/[slug]/chat/page.tsx` |

---

### Task 1: GET /api/citas/disponibles

**Files:**
- Create: `src/app/api/citas/disponibles/route.ts`

**Context:** The `medicos` table has a `horarios` JSON column with shape `{ lunes: { activo: bool, inicio: "09:00", fin: "17:00" }, martes: {...}, ... }` and a `duracion_cita_min` integer (e.g. 30). The `citas` table has `medico_id`, `fecha_inicio` (timestamptz), `fecha_fin` (timestamptz), `estado` (pendiente/confirmada/cancelada/completada/no_asistio). Weekday mapping: `lunes→1, martes→2, miercoles→3, jueves→4, viernes→5, sabado→6, domingo→0`.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/citas/disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addDays, format, parseISO, addMinutes, getDay } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

const WEEKDAY_MAP: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 0,
}

const TZ = 'America/Argentina/Buenos_Aires'

export async function GET(req: NextRequest) {
  const medicoId = req.nextUrl.searchParams.get('medico_id')
  if (!medicoId) {
    return NextResponse.json({ error: 'medico_id requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: medico } = await supabase
    .from('medicos')
    .select('id, horarios, duracion_cita_min')
    .eq('id', medicoId)
    .single()

  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
  }

  const duracion: number = medico.duracion_cita_min ?? 30
  const horarios: Record<string, { activo: boolean; inicio: string; fin: string }> =
    medico.horarios ?? {}

  // Fetch existing citas for the next 14 days
  const hoy     = toZonedTime(new Date(), TZ)
  const desde   = formatInTimeZone(hoy, TZ, "yyyy-MM-dd'T'00:00:00xxx")
  const hasta14 = formatInTimeZone(addDays(hoy, 14), TZ, "yyyy-MM-dd'T'23:59:59xxx")

  const { data: citasExistentes } = await supabase
    .from('citas')
    .select('fecha_inicio, fecha_fin')
    .eq('medico_id', medicoId)
    .neq('estado', 'cancelada')
    .gte('fecha_inicio', desde)
    .lte('fecha_inicio', hasta14)

  const ocupados: Array<{ inicio: Date; fin: Date }> = (citasExistentes ?? []).map(c => ({
    inicio: parseISO(c.fecha_inicio),
    fin:    parseISO(c.fecha_fin),
  }))

  const result: Array<{ fecha: string; label: string; slots: string[] }> = []

  const DIAS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  for (let i = 0; i < 14; i++) {
    const dia     = addDays(hoy, i)
    const jsDay   = getDay(dia)
    const fechaStr = formatInTimeZone(dia, TZ, 'yyyy-MM-dd')

    // Find which horario key matches this weekday
    const diaKey = Object.keys(WEEKDAY_MAP).find(k => WEEKDAY_MAP[k] === jsDay)
    if (!diaKey) continue

    const config = horarios[diaKey]
    if (!config?.activo) continue

    // Generate all slots for this day
    const [hIni, mIni] = config.inicio.split(':').map(Number)
    const [hFin, mFin] = config.fin.split(':').map(Number)

    const slotBase = toZonedTime(parseISO(`${fechaStr}T00:00:00`), TZ)
    slotBase.setHours(hIni, mIni, 0, 0)

    const endBase = toZonedTime(parseISO(`${fechaStr}T00:00:00`), TZ)
    endBase.setHours(hFin, mFin, 0, 0)

    const slots: string[] = []
    let cursor = new Date(slotBase)

    while (cursor < endBase) {
      const slotFin = addMinutes(cursor, duracion)
      if (slotFin > endBase) break

      // Check overlap with existing citas
      const ocupado = ocupados.some(c => cursor < c.fin && slotFin > c.inicio)

      if (!ocupado) {
        slots.push(formatInTimeZone(cursor, TZ, 'HH:mm'))
      }
      cursor = addMinutes(cursor, duracion)
    }

    if (slots.length > 0) {
      const dd    = formatInTimeZone(dia, TZ, 'd')
      const mm    = formatInTimeZone(dia, TZ, 'M')
      const label = `${DIAS_ES[jsDay].charAt(0).toUpperCase() + DIAS_ES[jsDay].slice(1)} ${dd}/${mm}`
      result.push({ fecha: fechaStr, label, slots })
    }
  }

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Check if date-fns-tz is installed**

```bash
grep '"date-fns-tz"' package.json
```

If not present:
```bash
npm install date-fns-tz
```

- [ ] **Step 3: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors related to `disponibles/route.ts`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/citas/disponibles/route.ts
git commit -m "feat: add GET /api/citas/disponibles endpoint"
```

---

### Task 2: POST /api/citas/crear

**Files:**
- Create: `src/app/api/citas/crear/route.ts`

**Context:** Needs to find-or-create a `pacientes` record by `(telefono, medico_id)`, then insert into `citas`. The `pacientes` table has `id`, `medico_id`, `nombre`, `telefono`. The `citas` table has `medico_id`, `paciente_id`, `fecha_inicio`, `fecha_fin`, `estado`. Return 409 if the slot is already taken (check before insert). Argentina timezone offset: -03:00.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/citas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

const TZ = 'America/Argentina/Buenos_Aires'

export async function POST(req: NextRequest) {
  let body: { medico_id?: string; nombre?: string; telefono?: string; fecha?: string; hora?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { medico_id, nombre, telefono, fecha, hora } = body

  if (!medico_id || !nombre || !telefono || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch medico to get duracion
  const { data: medico } = await supabase
    .from('medicos')
    .select('id, duracion_cita_min')
    .eq('id', medico_id)
    .single()

  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
  }

  const duracion: number = medico.duracion_cita_min ?? 30

  // Build timestamps in Argentina timezone
  const fechaInicioLocal = `${fecha}T${hora}:00`
  const fechaInicio = parseISO(`${fechaInicioLocal}-03:00`)
  const fechaFin    = addMinutes(fechaInicio, duracion)

  const fechaInicioISO = fechaInicio.toISOString()
  const fechaFinISO    = fechaFin.toISOString()

  // Check for conflict
  const { data: conflicto } = await supabase
    .from('citas')
    .select('id')
    .eq('medico_id', medico_id)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFinISO)
    .gt('fecha_fin', fechaInicioISO)
    .limit(1)
    .maybeSingle()

  if (conflicto) {
    return NextResponse.json({ error: 'Ese turno ya fue tomado' }, { status: 409 })
  }

  // Find or create paciente
  const { data: pacienteExistente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('telefono', telefono)
    .eq('medico_id', medico_id)
    .maybeSingle()

  let pacienteId: string

  if (pacienteExistente) {
    pacienteId = pacienteExistente.id
  } else {
    const { data: nuevoPaciente, error: errPaciente } = await supabase
      .from('pacientes')
      .insert({ medico_id, nombre: nombre.trim(), telefono: telefono.trim() })
      .select('id')
      .single()

    if (errPaciente || !nuevoPaciente) {
      return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 })
    }
    pacienteId = nuevoPaciente.id
  }

  // Insert cita
  const { data: cita, error: errCita } = await supabase
    .from('citas')
    .insert({
      medico_id,
      paciente_id: pacienteId,
      fecha_inicio: fechaInicioISO,
      fecha_fin:    fechaFinISO,
      estado:       'pendiente',
    })
    .select('id')
    .single()

  if (errCita || !cita) {
    return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  }

  return NextResponse.json({
    ok:          true,
    cita_id:     cita.id,
    fecha_inicio: fechaInicioISO,
    fecha_fin:    fechaFinISO,
  })
}
```

- [ ] **Step 2: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors related to `crear/route.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/citas/crear/route.ts
git commit -m "feat: add POST /api/citas/crear endpoint"
```

---

### Task 3: CalendarioTurnos component

**Files:**
- Create: `src/components/chat/CalendarioTurnos.tsx`

**Context:** Dark theme: `#20201F` page bg, `#2A2A29` card bg, `#3D3D3B` borders, `#7AB619` accent (green), `#F0F0EE` primary text, `#5C5C59` secondary text. 3-step flow: step 1 shows date chips (horizontal scroll), step 2 shows time slot grid for selected date, step 3 shows nombre+telefono form + confirm button.

- [ ] **Step 1: Create the component file**

```typescript
// src/components/chat/CalendarioTurnos.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface DiaDisponible {
  fecha:  string
  label:  string
  slots:  string[]
}

interface Props {
  medicoId:    string
  onConfirmed: (label: string) => void
}

export default function CalendarioTurnos({ medicoId, onConfirmed }: Props) {
  const [dias,            setDias]            = useState<DiaDisponible[]>([])
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [nombre,          setNombre]          = useState('')
  const [telefono,        setTelefono]        = useState('')
  const [step,            setStep]            = useState<'fecha' | 'hora' | 'confirm'>('fecha')
  const [loading,         setLoading]         = useState(true)
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/citas/disponibles?medico_id=${medicoId}`)
      .then(r => r.json())
      .then((data: DiaDisponible[]) => {
        setDias(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Error de conexión. Intentá de nuevo.')
        setLoading(false)
      })
  }, [medicoId])

  async function confirmarTurno() {
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completá tu nombre y teléfono.')
      return
    }
    if (!diaSeleccionado || !horaSeleccionada) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/citas/crear', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medico_id: medicoId,
          nombre:    nombre.trim(),
          telefono:  telefono.trim(),
          fecha:     diaSeleccionado.fecha,
          hora:      horaSeleccionada,
        }),
      })

      if (res.status === 409) {
        setError('Ese turno ya fue tomado, elegí otro.')
        setStep('fecha')
        setDiaSeleccionado(null)
        setHoraSeleccionada(null)
        return
      }

      if (!res.ok) {
        setError('Error al confirmar. Intentá de nuevo.')
        return
      }

      onConfirmed(`${diaSeleccionado.label} a las ${horaSeleccionada}`)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    background:   '#2A2A29',
    border:       '1px solid #3D3D3B',
    borderRadius: '12px',
    padding:      '14px',
    marginTop:    '6px',
  }

  if (loading) {
    return (
      <div style={containerStyle} className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" style={{ color: '#7AB619' }} />
        <span style={{ color: '#5C5C59', fontSize: '13px' }}>Cargando turnos...</span>
      </div>
    )
  }

  if (dias.length === 0 && !error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#5C5C59', fontSize: '13px' }}>
          No hay turnos disponibles en los próximos 14 días.
        </p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Step 1: fecha */}
      {step === 'fecha' && (
        <div>
          <p style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '10px' }}>
            Seleccioná una fecha:
          </p>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {dias.map(dia => (
              <button
                key={dia.fecha}
                onClick={() => { setDiaSeleccionado(dia); setStep('hora') }}
                style={{
                  background:   diaSeleccionado?.fecha === dia.fecha ? '#7AB619' : 'rgba(122,182,25,0.15)',
                  color:        diaSeleccionado?.fecha === dia.fecha ? '#20201F' : '#7AB619',
                  border:       diaSeleccionado?.fecha === dia.fecha ? 'none' : '1px solid rgba(122,182,25,0.3)',
                  borderRadius: '20px',
                  padding:      '6px 14px',
                  fontSize:     '12px',
                  fontWeight:   600,
                  flexShrink:   0,
                  cursor:       'pointer',
                  whiteSpace:   'nowrap',
                }}
              >
                {dia.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: hora */}
      {step === 'hora' && diaSeleccionado && (
        <div>
          <button
            onClick={() => { setStep('fecha'); setHoraSeleccionada(null) }}
            style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {diaSeleccionado.label}
          </button>
          <p style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '10px' }}>
            Horarios disponibles:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {diaSeleccionado.slots.map(slot => (
              <button
                key={slot}
                onClick={() => { setHoraSeleccionada(slot); setStep('confirm') }}
                style={{
                  background:   'rgba(122,182,25,0.15)',
                  color:        '#7AB619',
                  border:       '1px solid rgba(122,182,25,0.3)',
                  borderRadius: '8px',
                  padding:      '5px 10px',
                  fontSize:     '12px',
                  cursor:       'pointer',
                }}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: confirm */}
      {step === 'confirm' && diaSeleccionado && horaSeleccionada && (
        <div>
          <button
            onClick={() => { setStep('hora'); setNombre(''); setTelefono(''); setError(null) }}
            style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {diaSeleccionado.label} · {horaSeleccionada}
          </button>
          <p style={{ color: '#F0F0EE', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
            Confirmá tu turno
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              style={{
                background:   '#20201F',
                border:       '1px solid #3D3D3B',
                borderRadius: '8px',
                padding:      '9px 12px',
                color:        '#F0F0EE',
                fontSize:     '13px',
                outline:      'none',
              }}
            />
            <input
              type="tel"
              placeholder="Tu teléfono"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              style={{
                background:   '#20201F',
                border:       '1px solid #3D3D3B',
                borderRadius: '8px',
                padding:      '9px 12px',
                color:        '#F0F0EE',
                fontSize:     '13px',
                outline:      'none',
              }}
            />
          </div>
          {error && (
            <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>
          )}
          <button
            onClick={confirmarTurno}
            disabled={submitting}
            style={{
              background:   '#7AB619',
              color:        '#20201F',
              border:       'none',
              borderRadius: '10px',
              padding:      '11px',
              fontSize:     '13px',
              fontWeight:   700,
              width:        '100%',
              marginTop:    '12px',
              cursor:       submitting ? 'not-allowed' : 'pointer',
              opacity:      submitting ? 0.7 : 1,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          '6px',
            }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirmar turno
          </button>
        </div>
      )}

      {error && step !== 'confirm' && (
        <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors related to `CalendarioTurnos.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/CalendarioTurnos.tsx
git commit -m "feat: add CalendarioTurnos chat component"
```

---

### Task 4: Wire CalendarioTurnos into chat page

**Files:**
- Modify: `src/app/app/[slug]/chat/page.tsx`

**Context:** The current chat page is at `src/app/app/[slug]/chat/page.tsx`. The `Mensaje` interface uses `role: 'user' | 'assistant'`. The `enviarMensaje` function sets `data.response` as an assistant bubble. We need to extend the `Mensaje` type to support `role: 'calendar'`, detect `data.action === 'show_calendar'` after the API call, and render `<CalendarioTurnos>` below the assistant text bubble for calendar messages. The `onConfirmed` callback appends a confirmation bubble.

- [ ] **Step 1: Add `'calendar'` to the Mensaje type**

In `src/app/app/[slug]/chat/page.tsx`, find:
```typescript
interface Mensaje {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: Date
}
```

Replace with:
```typescript
interface Mensaje {
  id:        string
  role:      'user' | 'assistant' | 'calendar'
  content:   string
  timestamp: Date
}
```

- [ ] **Step 2: Add CalendarioTurnos import**

At the top of `src/app/app/[slug]/chat/page.tsx`, after the existing imports, add:
```typescript
import CalendarioTurnos from '@/components/chat/CalendarioTurnos'
```

- [ ] **Step 3: Replace the assistant bubble logic in enviarMensaje**

Find the `try` block inside `enviarMensaje`:
```typescript
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medico_id: medicoId, chat_id: chatId, message: textoUsuario }),
      })
      const data = await res.json()
      setMensajes(prev => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   data.response || 'Lo siento, no pude procesar tu mensaje.',
        timestamp: new Date(),
      }])
```

Replace with:
```typescript
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medico_id: medicoId, chat_id: chatId, message: textoUsuario }),
      })
      const data = await res.json()
      if (data.action === 'show_calendar') {
        setMensajes(prev => [...prev, {
          id:        crypto.randomUUID(),
          role:      'calendar',
          content:   data.response || '¡Elegí una fecha disponible!',
          timestamp: new Date(),
        }])
      } else {
        setMensajes(prev => [...prev, {
          id:        crypto.randomUUID(),
          role:      'assistant',
          content:   data.response || 'Lo siento, no pude procesar tu mensaje.',
          timestamp: new Date(),
        }])
      }
```

- [ ] **Step 4: Update the render to handle 'calendar' messages**

In the JSX, find:
```tsx
        {mensajes.map(msg => <BurbujaMensaje key={msg.id} mensaje={msg} />)}
```

Replace with:
```tsx
        {mensajes.map(msg => (
          <div key={msg.id}>
            <BurbujaMensaje mensaje={msg} />
            {msg.role === 'calendar' && medicoId && (
              <CalendarioTurnos
                medicoId={medicoId}
                onConfirmed={(label) => {
                  setMensajes(prev => [...prev, {
                    id:        crypto.randomUUID(),
                    role:      'assistant',
                    content:   `✓ Turno confirmado: ${label}. ¡Te esperamos!`,
                    timestamp: new Date(),
                  }])
                }}
              />
            )}
          </div>
        ))}
```

- [ ] **Step 5: Fix BurbujaMensaje to treat 'calendar' like 'assistant'**

Find the `BurbujaMensaje` function:
```typescript
function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.role === 'user'
```

Keep it as-is — `calendar` role will render as an assistant bubble (not `esUsuario`), which is correct.

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: clean build with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/[slug]/chat/page.tsx
git commit -m "feat: wire CalendarioTurnos into chat page on action show_calendar"
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /api/citas/disponibles` — weekday mapping, slot generation, overlap check, 14-day window
- ✅ `POST /api/citas/crear` — find-or-create paciente, 409 conflict check, insert cita
- ✅ `CalendarioTurnos` — 3 steps (fecha → hora → confirm), dark theme colors, error states
- ✅ Chat page — `action === 'show_calendar'` detection, calendar message type, `onConfirmed` bubble
- ✅ Error handling — 409→reset to step 1, empty days, network errors, empty fields

**Type consistency:**
- `DiaDisponible` defined in `CalendarioTurnos.tsx`, used internally only — consistent
- `Mensaje.role` extended to `'calendar'` in chat page — `BurbujaMensaje` receives it, treats non-`'user'` as assistant bubble — correct
- API response shape `{ fecha, label, slots }` matches what component reads

**No placeholders:** all code blocks are complete.
