# Campañas Rich Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar imagen de promo, emoji picker y negritas al campo Mensaje de campañas, y renderizar ese contenido rich en el chat del cliente.

**Architecture:** El formulario de campañas recibe una toolbar (B / emoji / imagen) sobre el textarea. La imagen se sube a Supabase Storage vía `/api/chat/imagen` al momento de enviar. El contenido se guarda como texto markdown (`**negrita**`) en la columna `content` e `image_url` en la tabla `mensajes`. El chat renderiza markdown con una función mínima sin librería.

**Tech Stack:** Next.js 14, React 18, Tailwind, Supabase Storage, Lucide React (ya instalado)

---

## File Map

| Archivo | Tipo | Qué cambia |
|---|---|---|
| `src/app/dashboard/campanias/CampaniasCliente.tsx` | Modify | Toolbar + emoji picker + image upload + preview |
| `src/app/api/campanias/enviar/route.ts` | Modify | Acepta `image_url`, strip markdown para push, `data.image` en payload, `image_url` en mensajes |
| `src/app/app/[slug]/chat/page.tsx` | Modify | `renderMd()` + actualizar `BurbujaMensaje` |

---

## Task 1: Toolbar + emoji picker + imagen en `CampaniasCliente.tsx`

**Files:**
- Modify: `src/app/dashboard/campanias/CampaniasCliente.tsx`

- [ ] **Step 1: Agregar imports nuevos**

Al inicio del archivo, agregar `useRef` al import de React y `ImagePlus, X, Bold` a lucide-react:

```tsx
import { useState, useRef } from 'react'
import { Megaphone, Send, Users, CheckCircle, XCircle, Clock, AlertCircle, ImagePlus, X, Bold } from 'lucide-react'
```

- [ ] **Step 2: Agregar constante EMOJIS arriba del componente `FormularioCampania`**

```tsx
const EMOJIS = [
  '😀','😊','😍','🥳','😎','🤩','🎉','✨','👋','💪',
  '🎁','🌟','⭐','💯','🔥','✅','💰','💎','🎯','📣',
  '🗓️','❤️','💚','👍','🙌','🏥','💊','🩺','🫶','📸',
  '🎨','🛍️','🤝','🆕','🎀',
]
```

- [ ] **Step 3: Reemplazar el estado y refs de `FormularioCampania`**

Reemplazar el bloque de estado actual:

```tsx
const [titulo, setTitulo]     = useState('')
const [contenido, setContenido] = useState('')
const [segmento, setSegmento] = useState<Segmento>('todos')
const [loading, setLoading]   = useState(false)
const [resultado, setResultado] = useState<{ enviados: number; fallidos: number } | null>(null)
const [error, setError]       = useState<string | null>(null)

const caracteresRestantes = 150 - contenido.length
```

Por este bloque expandido:

```tsx
const [titulo, setTitulo]           = useState('')
const [contenido, setContenido]     = useState('')
const [segmento, setSegmento]       = useState<Segmento>('todos')
const [loading, setLoading]         = useState(false)
const [resultado, setResultado]     = useState<{ enviados: number; fallidos: number } | null>(null)
const [error, setError]             = useState<string | null>(null)
const [imagenPrevia, setImagenPrevia] = useState<{ file: File; preview: string } | null>(null)
const [uploadingImg, setUploadingImg] = useState(false)
const [emojiOpen, setEmojiOpen]     = useState(false)

const textareaRef = useRef<HTMLTextAreaElement>(null)
const fileRef     = useRef<HTMLInputElement>(null)

const caracteresRestantes = 500 - contenido.length
```

- [ ] **Step 4: Agregar helpers de inserción justo después de los estados**

```tsx
function insertBold() {
  const ta = textareaRef.current
  if (!ta) return
  const start    = ta.selectionStart
  const end      = ta.selectionEnd
  const selected = contenido.slice(start, end)
  if (selected) {
    const next = contenido.slice(0, start) + `**${selected}**` + contenido.slice(end)
    setContenido(next)
    setTimeout(() => ta.setSelectionRange(end + 4, end + 4), 0)
  } else {
    const next = contenido.slice(0, start) + '**texto**' + contenido.slice(end)
    setContenido(next)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 7) }, 0)
  }
}

function insertEmoji(emoji: string) {
  const ta = textareaRef.current
  if (!ta) return
  const start = ta.selectionStart
  const next  = contenido.slice(0, start) + emoji + contenido.slice(start)
  setContenido(next)
  setEmojiOpen(false)
  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length) }, 0)
}

function seleccionarImagen(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  setImagenPrevia({ file, preview: URL.createObjectURL(file) })
  e.target.value = ''
}

function quitarImagen() {
  if (imagenPrevia) URL.revokeObjectURL(imagenPrevia.preview)
  setImagenPrevia(null)
}
```

- [ ] **Step 5: Actualizar `handleEnviar` para subir imagen y enviar `image_url`**

Reemplazar la función `handleEnviar` completa:

```tsx
async function handleEnviar() {
  if (!titulo.trim() || !contenido.trim()) return
  if (!negocioId) return

  setLoading(true)
  setError(null)
  setResultado(null)

  let imageUrl: string | undefined

  if (imagenPrevia) {
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('imagen', imagenPrevia.file)
      const res  = await fetch('/api/chat/imagen', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) imageUrl = data.url
    } catch {}
    setUploadingImg(false)
    URL.revokeObjectURL(imagenPrevia.preview)
    setImagenPrevia(null)
  }

  try {
    const res = await fetch('/api/campanias/enviar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, contenido, image_url: imageUrl, segmento, negocio_id: negocioId }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al enviar la campaña')
      return
    }

    setResultado({ enviados: data.enviados, fallidos: data.fallidos })
    onEnviada(data.campania)
    setTitulo('')
    setContenido('')
    setSegmento('todos')
  } catch {
    setError('Error de conexión. Intentá de nuevo.')
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 6: Reemplazar el bloque JSX del campo "Contenido"**

Reemplazar todo el `<div>` del campo Contenido (desde el label "Mensaje" hasta el cierre del `</div>` que contiene el textarea):

```tsx
{/* Contenido */}
<div>
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-xs font-medium" style={{ color: '#9A9A96' }}>
      Mensaje
    </label>
    <span className="text-xs" style={{ color: caracteresRestantes < 50 ? '#F59E0B' : '#5C5C59' }}>
      {caracteresRestantes} restantes
    </span>
  </div>

  {/* Editor con toolbar */}
  <div className="rounded-lg overflow-visible"
    style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>

    {/* Toolbar */}
    <div className="flex items-center gap-0.5 px-2 py-1.5"
      style={{ borderBottom: '1px solid #3D3D3B' }}>

      {/* Bold */}
      <button
        type="button"
        onClick={insertBold}
        className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors"
        style={{ color: '#9A9A96' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9A9A96')}
        title="Negrita">
        <Bold size={14} />
      </button>

      {/* Emoji */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setEmojiOpen(o => !o)}
          className="w-7 h-7 rounded flex items-center justify-center text-base transition-colors"
          title="Emoji">
          😊
        </button>
        {emojiOpen && (
          <>
            {/* Backdrop para cerrar */}
            <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
            <div className="absolute top-8 left-0 z-20 rounded-xl p-2 shadow-lg"
              style={{ background: '#2A2A29', border: '1px solid #3D3D3B', width: '228px' }}>
              <div className="grid grid-cols-7 gap-0.5">
                {EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => insertEmoji(em)}
                    className="w-8 h-8 rounded flex items-center justify-center text-lg transition-colors"
                    style={{ fontSize: '18px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#3D3D3B')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Imagen */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
        style={{ color: imagenPrevia ? '#7AB619' : '#9A9A96' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
        onMouseLeave={e => (e.currentTarget.style.color = imagenPrevia ? '#7AB619' : '#9A9A96')}
        title="Adjuntar imagen">
        <ImagePlus size={14} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={seleccionarImagen}
      />
    </div>

    {/* Preview imagen */}
    {imagenPrevia && (
      <div className="px-3 pt-2 relative inline-block">
        <img
          src={imagenPrevia.preview}
          alt="Preview"
          className="rounded-lg"
          style={{ height: '72px', width: 'auto', maxWidth: '140px', objectFit: 'cover' }}
        />
        <button
          type="button"
          onClick={quitarImagen}
          className="absolute top-0.5 right-0 rounded-full p-0.5"
          style={{ background: '#EF4444', color: '#fff' }}>
          <X size={11} />
        </button>
      </div>
    )}

    {/* Textarea */}
    <textarea
      ref={textareaRef}
      value={contenido}
      onChange={e => setContenido(e.target.value)}
      onFocus={e => (e.currentTarget.closest('[data-editor]')?.setAttribute('data-focus', 'true'))}
      onBlur={e => (e.currentTarget.closest('[data-editor]')?.removeAttribute('data-focus'))}
      placeholder="Escribí el mensaje que verán tus pacientes..."
      maxLength={500}
      rows={3}
      className="w-full px-4 py-2.5 text-sm resize-none bg-transparent outline-none"
      style={{ color: '#F0F0EE' }}
    />
  </div>
</div>
```

- [ ] **Step 7: Actualizar el botón "Enviar campaña" para deshabilitar también durante upload**

Reemplazar `disabled={loading || !titulo.trim() || !contenido.trim()}`:

```tsx
disabled={loading || uploadingImg || !titulo.trim() || !contenido.trim()}
```

Y el texto del botón:

```tsx
{loading || uploadingImg ? (
  <span className="animate-pulse">
    {uploadingImg ? 'Subiendo imagen...' : 'Enviando...'}
  </span>
) : (
  <>
    <Send size={15} />
    Enviar campaña
  </>
)}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/campanias/CampaniasCliente.tsx
git commit -m "feat: toolbar rich content en formulario de campañas (bold, emoji, imagen)"
```

---

## Task 2: API `/api/campanias/enviar` — aceptar `image_url` y actualizar push payload

**Files:**
- Modify: `src/app/api/campanias/enviar/route.ts`

- [ ] **Step 1: Agregar función `stripMarkdown` a nivel módulo y actualizar destructuring**

Agregar `stripMarkdown` justo después de los imports (antes del `export async function POST`):

```typescript
function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/gs, '$1').trim()
}
```

Luego, dentro del bloque `try`, reemplazar:

```typescript
const { titulo, contenido, segmento, negocio_id } = await req.json()

if (!titulo || !contenido || !negocio_id) {
  return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
}
```

Por:

```typescript
const { titulo, contenido, image_url, segmento, negocio_id } = await req.json()

if (!titulo || !contenido || !negocio_id) {
  return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
}

const bodyPush = stripMarkdown(contenido).slice(0, 150)
```

- [ ] **Step 2: Actualizar `chatUrl` y el payload push para incluir `image` y usar `bodyPush`**

Reemplazar las líneas `const chatUrl = ...` y `const payload = JSON.stringify(...)` juntas:

```typescript
const chatUrl = `${chatBaseUrl}?campania=${encodeURIComponent(bodyPush)}`
const payload = JSON.stringify({
  title: titulo,
  body:  bodyPush,
  icon:  '/favicon.ico',
  badge: '/favicon.ico',
  ...(image_url ? { image: image_url } : {}),
  data: {
    tag: 'campania',
    url: chatUrl,
  },
})
```

- [ ] **Step 3: Actualizar insert de mensajes para incluir `image_url`**

Reemplazar el `sessions.map(...)` dentro del bloque de inserción de mensajes:

```typescript
await supabase.from('mensajes').insert(
  sessions.map(s => ({
    negocio_id,
    chat_id:    s.chat_id,
    cliente_id: s.cliente_id,
    role:       'assistant',
    content:    contenido,
    image_url:  image_url ?? null,
  }))
)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/campanias/enviar/route.ts
git commit -m "feat: campanias enviar acepta image_url, strip markdown para push"
```

---

## Task 3: Render markdown en `BurbujaMensaje` del chat

**Files:**
- Modify: `src/app/app/[slug]/chat/page.tsx`

- [ ] **Step 1: Agregar función `renderMd` antes del componente `BurbujaMensaje`**

Agregar esta función justo antes de la función `BurbujaMensaje` (alrededor de la línea 34):

```tsx
function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}
```

El orden importa: primero escapar HTML, luego aplicar markdown. Esto evita XSS si algún contenido externo llegara a colarse.

- [ ] **Step 2: Actualizar el render del texto en `BurbujaMensaje`**

Reemplazar:

```tsx
{mensaje.content && (
  <p className="text-sm leading-relaxed whitespace-pre-wrap">{mensaje.content}</p>
)}
```

Por:

```tsx
{mensaje.content && (
  <p
    className="text-sm leading-relaxed"
    dangerouslySetInnerHTML={{ __html: renderMd(mensaje.content) }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/app/[slug]/chat/page.tsx
git commit -m "feat: chat renderiza markdown bold en burbujas de mensajes"
```

---

## Task 4: Verificación manual

- [ ] **Step 1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Probar el formulario de campañas**

Ir a `http://localhost:3000/dashboard/campanias` y verificar:
- La toolbar aparece arriba del textarea (B / emoji / imagen)
- El botón **B** con texto seleccionado: wrappea con `**...**`
- El botón **B** sin selección: inserta `**texto**` con "texto" seleccionado listo para reemplazar
- El picker de emojis abre un grid de 35 emojis; click en uno lo inserta en el cursor
- El picker se cierra al clickear fuera (backdrop)
- El botón de imagen abre el file picker; la imagen previewea arriba del textarea con botón X para quitar
- El contador cambia de 150 → 500 caracteres restantes
- El botón "Enviar campaña" dice "Subiendo imagen..." durante el upload

- [ ] **Step 3: Probar el render en el chat**

Enviar una campaña de prueba con:
- Texto con negritas: `Hola **mundo**`
- Emojis: `🎉 Promoción especial`
- Una imagen adjunta

Abrir `http://localhost:3000/app/<slug>/chat` y verificar:
- El texto `**mundo**` se ve en negrita (no como asteriscos)
- Los emojis se ven correctamente
- La imagen aparece arriba del texto en la burbuja

- [ ] **Step 4: Verificar lint**

```bash
npm run lint
```

Expected: sin errores nuevos.
