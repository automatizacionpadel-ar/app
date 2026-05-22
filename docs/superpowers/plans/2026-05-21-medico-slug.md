# Médico Slug URLs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace UUID query-param URLs (`/app?m=UUID`) with slug-based paths (`/app/garcia-lopez`) for all patient-facing routes.

**Architecture:** Add a `slug` column to `medicos`, auto-generated from `nombre_completo` at creation time using a shared `slugify()` utility. Change frontend routes from `/app` and `/app/chat` to `/app/[slug]` and `/app/[slug]/chat`. Update the public API to look up by slug instead of id.

**Tech Stack:** Next.js 14 App Router, Supabase Postgres (`unaccent` extension), TypeScript

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/lib/slugify.ts` | Pure slugify function, shared by API routes |
| Create | `supabase/migrations/20260522_medicos_slug.sql` | Add slug column, backfill, unique constraint |
| Modify | `src/app/api/medicos/crear/route.ts` | Generate + insert slug on doctor creation |
| Modify | `src/app/api/medicos/publico/route.ts` | Accept `?slug=` param, lookup by slug |
| Create | `src/app/app/[slug]/page.tsx` | Patient PWA entry — reads `params.slug` |
| Create | `src/app/app/[slug]/chat/page.tsx` | Patient chat — reads `params.slug` |
| Delete | `src/app/app/page.tsx` | Replaced by `[slug]/page.tsx` |
| Delete | `src/app/app/chat/page.tsx` | Replaced by `[slug]/chat/page.tsx` |

---

### Task 1: slugify utility

**Files:**
- Create: `src/lib/slugify.ts`

- [ ] **Step 1: Create the slugify function**

```typescript
// src/lib/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining accents
    .replace(/[^a-z0-9\s]/g, '')      // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')             // spaces to hyphens
    .replace(/-+/g, '-')              // collapse consecutive hyphens
}
```

- [ ] **Step 2: Verify manually in Node**

Run:
```bash
node -e "
const { slugify } = require('./src/lib/slugify.ts')
" 2>&1 || node --input-type=module << 'EOF'
import { slugify } from './src/lib/slugify.js'
const cases = [
  ['Dr. García López', 'garcia-lopez'],
  ['Dra. Sofía García López', 'sofia-garcia-lopez'],
  ['Juan  Pérez', 'juan-perez'],
  ['O\'Brien', 'obrien'],
]
cases.forEach(([input, expected]) => {
  const got = slugify(input)
  console.log(got === expected ? '✓' : '✗', input, '->', got, expected !== got ? `(expected ${expected})` : '')
})
EOF
```

> Since this is a TypeScript project without a test runner for Node scripts, verify by running the build after Task 3 instead.

- [ ] **Step 3: Commit**

```bash
git add src/lib/slugify.ts
git commit -m "feat: add slugify utility for medico slug generation"
```

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260522_medicos_slug.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260522_medicos_slug.sql

-- Enable unaccent extension for accent-insensitive slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug column (nullable initially to allow backfill)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing rows using the same logic as slugify()
UPDATE medicos
SET slug = regexp_replace(
             regexp_replace(
               lower(unaccent(nombre_completo)),
               '[^a-z0-9 ]', '', 'g'
             ),
             ' +', '-', 'g'
           )
WHERE slug IS NULL;

-- Add unique constraint and index
ALTER TABLE medicos ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medicos_slug_key'
  ) THEN
    ALTER TABLE medicos ADD CONSTRAINT medicos_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS medicos_slug_idx ON medicos (slug);
```

- [ ] **Step 2: Apply the migration via Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New query. Paste the full SQL above and run it.

Expected: no errors. Run this verification query:
```sql
SELECT id, nombre_completo, slug FROM medicos LIMIT 10;
```
Every row should have a non-null slug value.

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/20260522_medicos_slug.sql
git commit -m "feat: add slug column to medicos with backfill"
```

---

### Task 3: Update /api/medicos/crear to generate slug

**Files:**
- Modify: `src/app/api/medicos/crear/route.ts`

- [ ] **Step 1: Add the slug generation helper and import**

At the top of `src/app/api/medicos/crear/route.ts`, add the import and a helper that handles collision:

```typescript
import { slugify } from '@/lib/slugify'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  nombre: string
): Promise<string> {
  const base = slugify(nombre) || 'medico'
  let candidate = base
  let i = 2
  while (true) {
    const { data } = await supabase
      .from('medicos')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i++}`
  }
}
```

- [ ] **Step 2: Generate slug before the medicos insert**

In the `POST` handler, between step 1 (auth user creation) and step 3 (medicos insert), add:

```typescript
// Generate unique slug from nombre_completo
const slug = await generateUniqueSlug(supabase, nombre_completo)
```

- [ ] **Step 3: Add slug to the medicos insert**

In the `.insert({...})` call for the `medicos` table, add `slug` to the object:

```typescript
const { data: medico, error: medicoError } = await supabase
  .from('medicos')
  .insert({
    usuario_id: userId,
    slug,                               // ← add this line
    nombre_completo,
    especialidad,
    telefono:           telefono || null,
    email:              email || null,
    direccion:          direccion || null,
    descripcion:        descripcion || null,
    duracion_cita_min:  duracion_cita_min ?? 30,
    dias_anticipacion:  dias_anticipacion ?? 30,
    horarios:           horarios || null,
    requiere_sena:      requiere_sena ?? false,
    monto_sena:         requiere_sena && monto_sena ? parseFloat(monto_sena) : null,
    alias_mp:           alias_mp || null,
    cbu:                cbu || null,
    titular_cuenta:     titular_cuenta || null,
    activo:             true,
  })
  .select()
  .single()
```

- [ ] **Step 4: Return slug in the response**

Change the final `return NextResponse.json(...)` to include `slug`:

```typescript
return NextResponse.json({
  ok: true,
  medico_id:     medico.id,
  slug:          medico.slug,
  webhook_token: medico.webhook_token,
})
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/medicos/crear/route.ts src/lib/slugify.ts
git commit -m "feat: generate unique slug on medico creation"
```

---

### Task 4: Update /api/medicos/publico to look up by slug

**Files:**
- Modify: `src/app/api/medicos/publico/route.ts`

- [ ] **Step 1: Change parameter from `id` to `slug`**

Replace the entire `GET` handler body. The full updated file:

```typescript
// src/app/api/medicos/publico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: medico } = await supabase
      .from('medicos')
      .select(`
        id,
        slug,
        nombre_completo,
        especialidad,
        direccion,
        telefono,
        activo,
        medico_agente_config (
          mensaje_bienvenida
        )
      `)
      .eq('slug', slug)
      .eq('activo', true)
      .single()

    if (!medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const config = (medico.medico_agente_config as any[])?.[0]

    return NextResponse.json({
      id:                 medico.id,
      slug:               medico.slug,
      nombre_completo:    medico.nombre_completo,
      especialidad:       medico.especialidad,
      direccion:          medico.direccion,
      telefono:           medico.telefono,
      mensaje_bienvenida: config?.mensaje_bienvenida ?? null,
    })
  } catch (error) {
    console.error('Error en /api/medicos/publico:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/medicos/publico/route.ts
git commit -m "feat: look up medico by slug in public API"
```

---

### Task 5: Create /app/[slug]/page.tsx

**Files:**
- Create: `src/app/app/[slug]/page.tsx`
- Delete: `src/app/app/page.tsx`

- [ ] **Step 1: Create the directory and new page file**

```bash
mkdir -p src/app/app/\[slug\]
```

- [ ] **Step 2: Write the new page**

Key changes from the old `src/app/app/page.tsx`:
- No `useSearchParams` — reads `params.slug` from route props instead
- Fetches `/api/medicos/publico?slug=${slug}` instead of `?id=...`
- Navigation to chat uses `/app/${slug}/chat`
- No `<Suspense>` wrapper needed (no `useSearchParams`)

Full file content:

```typescript
// src/app/app/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MessageCircle, Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface MedicoPublico {
  id:                 string
  slug:               string
  nombre_completo:    string
  especialidad:       string
  mensaje_bienvenida?: string
}

export default function AppPage({ params }: { params: { slug: string } }) {
  const { slug }  = params
  const router    = useRouter()

  const [medico, setMedico]   = useState<MedicoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatId]              = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('simplificia_chat_id')
    if (stored) return stored
    const nuevo = crypto.randomUUID()
    localStorage.setItem('simplificia_chat_id', nuevo)
    return nuevo
  })

  const { estado: pushEstado, solicitarPermiso } = usePushNotifications(
    chatId || null,
    medico?.id ?? null
  )

  useEffect(() => {
    fetch(`/api/medicos/publico?slug=${slug}`)
      .then(r => r.json())
      .then(data => { setMedico(data.error ? null : data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  function irAlChat() {
    router.push(`/app/${slug}/chat`)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: '#7AB619' }} />
      </div>
    )
  }

  if (!medico) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Image src="/logo.png" alt="SimplificIA" width={160} height={42} className="mb-6" />
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Link inválido. Pedile al consultorio el link correcto.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-up">

      <Image src="/logo.png" alt="SimplificIA" width={140} height={36} className="mb-8" />

      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
        style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
        {medico.nombre_completo.charAt(0)}
      </div>

      <h1 className="text-xl font-bold mb-1" style={{ color: '#F0F0EE' }}>
        {medico.nombre_completo}
      </h1>
      <p className="text-sm mb-2" style={{ color: '#9A9A96' }}>
        {medico.especialidad}
      </p>

      {medico.mensaje_bienvenida && (
        <p className="text-sm mb-8 max-w-xs" style={{ color: '#5C5C59' }}>
          {medico.mensaje_bienvenida}
        </p>
      )}

      <div className="w-full max-w-xs space-y-3">

        <button onClick={irAlChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <MessageCircle size={18} />
          Hablar con el asistente
        </button>

        {pushEstado === 'idle' && (
          <button onClick={solicitarPermiso}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B', color: '#9A9A96' }}>
            <Bell size={18} />
            Activar recordatorios de citas
          </button>
        )}

        {pushEstado === 'loading' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-4"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#9A9A96' }}>Activando...</span>
          </div>
        )}

        {pushEstado === 'granted' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(122,182,25,0.1)', border: '1px solid rgba(122,182,25,0.2)' }}>
            <Bell size={16} style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#7AB619' }}>Recordatorios activados ✓</span>
          </div>
        )}

        {pushEstado === 'denied' && (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <BellOff size={16} style={{ color: '#EF4444' }} />
            <span className="text-sm" style={{ color: '#EF4444' }}>Notificaciones bloqueadas</span>
          </div>
        )}

        {pushEstado === 'unsupported' && (
          <p className="text-xs text-center" style={{ color: '#5C5C59' }}>
            Tu navegador no soporta notificaciones push.
            Instalá la app en tu pantalla de inicio para activarlas.
          </p>
        )}
      </div>

      <p className="text-xs mt-8" style={{ color: '#5C5C59' }}>
        💡 Instalá esta app en tu celular para acceder más rápido
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Delete the old page**

```bash
rm src/app/app/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/app/app/\[slug\]/page.tsx
git rm src/app/app/page.tsx
git commit -m "feat: patient PWA entry now uses slug route /app/[slug]"
```

---

### Task 6: Create /app/[slug]/chat/page.tsx

**Files:**
- Create: `src/app/app/[slug]/chat/page.tsx`
- Delete: `src/app/app/chat/page.tsx`

- [ ] **Step 1: Write the new chat page**

Key changes from old `src/app/app/chat/page.tsx`:
- Reads `params.slug` instead of `useSearchParams().get('m')`
- Fetches `/api/medicos/publico?slug=${slug}` on mount to resolve `medicoId`
- No `<Suspense>` wrapper needed

```typescript
// src/app/app/[slug]/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Send, Loader2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Mensaje {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: Date
}

function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.role === 'user'
  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'} mb-3`}>
      {!esUsuario && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
        </div>
      )}
      <div className="max-w-[78%]">
        <div className="rounded-2xl px-4 py-2.5"
          style={{
            background:   esUsuario ? '#7AB619' : '#2A2A29',
            color:        esUsuario ? '#20201F' : '#F0F0EE',
            borderRadius: esUsuario ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{mensaje.content}</p>
        </div>
        <p className="text-[10px] mt-1 px-1"
          style={{ color: '#5C5C59', textAlign: esUsuario ? 'right' : 'left' }}>
          {format(mensaje.timestamp, 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2"
        style={{ background: 'rgba(122,182,25,0.15)' }}>
        <span style={{ color: '#7AB619', fontSize: '12px' }}>IA</span>
      </div>
      <div className="rounded-2xl px-4 py-3"
        style={{ background: '#2A2A29', borderRadius: '18px 18px 18px 4px' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: '#7AB619', animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router   = useRouter()

  const [medicoId, setMedicoId]   = useState<string | null>(null)
  const [mensajes, setMensajes]   = useState<Mensaje[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [chatId]                  = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('simplificia_chat_id') || crypto.randomUUID()
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, loading])

  // Resolve medicoId from slug on mount
  useEffect(() => {
    fetch(`/api/medicos/publico?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setMedicoId(data.id)
          setMensajes([{
            id:        'welcome',
            role:      'assistant',
            content:   '¡Hola! Soy el asistente del consultorio. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date(),
          }])
        }
      })
      .catch(console.error)
  }, [slug])

  async function enviarMensaje() {
    if (!input.trim() || loading || !medicoId) return

    const textoUsuario = input.trim()
    setInput('')

    const msgUsuario: Mensaje = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   textoUsuario,
      timestamp: new Date(),
    }

    setMensajes(prev => [...prev, msgUsuario])
    setLoading(true)

    try {
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
    } catch {
      setMensajes(prev => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   'Hubo un error de conexión. Por favor intentá de nuevo.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col h-screen">

      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <button onClick={() => router.back()} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(122,182,25,0.15)' }}>
          <span style={{ color: '#7AB619', fontSize: '14px', fontWeight: 600 }}>IA</span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Asistente</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7AB619' }} />
            <p className="text-xs" style={{ color: '#7AB619' }}>En línea</p>
          </div>
        </div>
        <div className="ml-auto">
          <Image src="/logo.png" alt="SimplificIA" width={90} height={24} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {mensajes.map(msg => <BurbujaMensaje key={msg.id} mensaje={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 pb-safe-bottom pb-4 pt-2"
        style={{ background: '#20201F', borderTop: '1px solid #2A2A29' }}>
        <div className="flex items-end gap-2 rounded-2xl px-4 py-2"
          style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm resize-none outline-none scrollbar-hide"
            style={{ color: '#F0F0EE', maxHeight: '120px', lineHeight: '1.5', paddingTop: '6px', paddingBottom: '6px' }}
          />
          <button
            onClick={enviarMensaje}
            disabled={loading || !input.trim()}
            className="rounded-xl p-2.5 flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: '#7AB619', color: '#20201F', marginBottom: '2px' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: '#3D3D3B' }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old chat page**

```bash
rm src/app/app/chat/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\[slug\]/chat/page.tsx
git rm src/app/app/chat/page.tsx
git commit -m "feat: patient chat now uses slug route /app/[slug]/chat"
```

---

### Task 7: Build verification and push

- [ ] **Step 1: Run the build locally**

```bash
npm run build
```

Expected: all 17+ routes compile, no TypeScript errors, no prerender errors.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

Expected: Vercel auto-deploys. Build passes in ~1 min.

- [ ] **Step 3: Smoke test in production**

1. In Supabase, run `SELECT nombre_completo, slug FROM medicos LIMIT 5;` to find a slug.
2. Open `https://your-vercel-url.vercel.app/app/<slug>` — should show the doctor's PWA page.
3. Click "Hablar con el asistente" — should navigate to `/app/<slug>/chat`.
