# Campañas — Rich Content (imagen + emojis + negritas)

**Date:** 2026-05-26  
**Status:** Approved

## Problema

El campo "Mensaje" de campañas es un `<textarea>` plano con límite de 150 chars. No permite imágenes, emojis con picker, ni formato.

## Alcance

Tres archivos, sin librerías nuevas pesadas:

| Archivo | Cambio |
|---|---|
| `src/app/dashboard/campanias/CampaniasCliente.tsx` | Toolbar (B + emoji + imagen), preview, upload al enviar |
| `src/app/api/campanias/enviar/route.ts` | Acepta `image_url`, strip markdown para push, `data.image` en payload |
| `src/app/app/[slug]/chat/page.tsx` | `renderMd()` para negritas en `BurbujaMensaje` |

---

## 1. Editor en el formulario de campaña

### Toolbar

```
┌─────────────────────────────────────────┐
│ [B]  [😊]  [📎 Imagen]                  │
├─────────────────────────────────────────┤
│  Escribí el mensaje...                  │
└─────────────────────────────────────────┘
```

- **B (bold)**: envuelve el texto seleccionado en `**...**`. Si no hay selección, inserta `**texto**` en el cursor y selecciona "texto".
- **😊 (emoji)**: abre un popover con ~35 emojis frecuentes (caras, celebración, salud, promos). Click inserta en posición del cursor.
- **📎 Imagen**: file picker → preview sobre el editor → sube a `/api/chat/imagen` (bucket `chat-imagenes`) al momento de enviar la campaña. Una sola imagen por campaña.

### Límite de caracteres

- El textarea pasa de 150 a 500 chars máximo.
- La notificación push usa internamente el texto sin markdown truncado a 150 chars.

### Emoji grid

~35 emojis hardcodeados en un array, sin librería:
```
😀 😊 😍 🥳 😎 🤩 🎉 ✨ 👋 💪
🎁 🌟 ⭐ 💯 🔥 ✅ 💰 💎 🎯 📣
🗓️ ❤️ 💚 👍 🙌 🏥 💊 ❤️‍🩹 🩺 🫶
📸 🎨 🛍️ 🤝 🆕
```

---

## 2. API `/api/campanias/enviar`

### Nuevos campos recibidos

```typescript
{ titulo, contenido, image_url?: string, segmento, negocio_id }
```

### Strip markdown para push

```typescript
function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').trim()
}
const bodyPush = stripMarkdown(contenido).slice(0, 150)
```

### Payload push

```json
{
  "title": "...",
  "body": "<texto plano truncado a 150>",
  "icon": "/favicon.ico",
  "badge": "/favicon.ico",
  "image": "<image_url si existe>",
  "data": {
    "tag": "campania",
    "url": "...?campania=<texto plano encodeado>"
  }
}
```

El campo `image` en el payload push es soportado por Chrome en Android y desktop — muestra la imagen en la notificación del sistema.

### Mensajes insertados en chat_sessions

```typescript
sessions.map(s => ({
  negocio_id,
  chat_id:    s.chat_id,
  cliente_id: s.cliente_id,
  role:       'assistant',
  content:    contenido,       // markdown preservado
  image_url:  image_url ?? null,
}))
```

### URL param `?campania=`

Usa el texto plano (sin markdown) para no generar URLs con caracteres `*`.

---

## 3. Render en el chat — `BurbujaMensaje`

### `renderMd` — función mínima sin librería

```typescript
function renderMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}
```

### Cambio en `BurbujaMensaje`

Reemplaza el `<p className="whitespace-pre-wrap">{mensaje.content}</p>` por:

```tsx
<p
  className="text-sm leading-relaxed"
  dangerouslySetInnerHTML={{ __html: renderMd(mensaje.content) }}
/>
```

El contenido siempre viene de nuestra propia DB (no de input de usuario externo), por lo que `dangerouslySetInnerHTML` es seguro aquí. Si se quiere extra seguridad, se puede filtrar antes con una allowlist de tags (`<strong>`, `<br>`).

Las imágenes ya se renderizan con el campo `imageUrl` existente — no requiere cambio.

---

## Flujo completo

1. Doctor abre Campañas, escribe mensaje con negritas/emojis y opcionalmente adjunta imagen.
2. Al click "Enviar campaña":
   a. Si hay imagen: POST a `/api/chat/imagen` → obtiene URL.
   b. POST a `/api/campanias/enviar` con `{ titulo, contenido, image_url, segmento, negocio_id }`.
3. API strips markdown, construye payload push con `image`, inserta mensajes en chat con `image_url`.
4. Clientes reciben notificación push con imagen preview (Chrome/Android).
5. Al abrir el chat, el mensaje aparece con la imagen arriba y el texto con negritas renderizadas.

---

## Decisiones

- **Sin librería de rich text** (Tiptap/Quill): la imagen es el contenido principal, markdown minimalista cubre el resto. Bundle 0KB extra.
- **Reutilizar `/api/chat/imagen`**: misma lógica, mismo bucket `chat-imagenes`, sin duplicación.
- **`dangerouslySetInnerHTML`** en chat: el contenido viene de nuestra DB, no de input directo del cliente del negocio en el chat público.
