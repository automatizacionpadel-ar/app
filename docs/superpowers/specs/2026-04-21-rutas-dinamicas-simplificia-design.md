# Diseño: Rutas Dinámicas Multi-Rubro + UI iOS — Simplificia

**Fecha:** 2026-04-21  
**Estado:** Aprobado

---

## Contexto

La PWA de pádel actual identifica el negocio mediante query params (`?complex_id=zona_norte`) y tiene los datos de los complejos hardcodeados en el código. El objetivo es migrar a rutas limpias por rubro y slug, cargar la configuración de cada negocio desde Baserow, rediseñar la interfaz con estilo iOS, y agregar una peluquería como primer caso de un nuevo rubro.

---

## 1. Estructura de URLs

Formato: `/:rubro/:slug`

**Ejemplos:**
- `/padel/zona-norte`
- `/padel/zona-sur`
- `/padel/centro`
- `/peluqueria/corte-urbano` ← nuevo

**Implementación del router:**
- Se agrega React Router v6 al proyecto
- Una ruta `/:rubro/:slug` renderiza `ChatApp`
- `ChatApp` lee `rubro` y `slug` con `useParams()`

**Configuración Vercel (`vercel.json`):**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Configuración futura en Nginx (VPS Hostinger):**
```nginx
location / {
  try_files $uri /index.html;
}
```

---

## 2. Tabla `negocios` en Baserow

Tabla nueva, lectura pública (sin API key en el frontend).

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | Texto | Nombre visible del negocio |
| `rubro` | Texto | Identificador del rubro (padel, peluqueria) |
| `slug` | Texto | Identificador único dentro del rubro |
| `color_primario` | Texto | Color hex principal (#FF6B6B) |
| `color_dark` | Texto | Variante oscura para hover/pressed (#cc5555) |
| `logo_emoji` | Texto | Emoji representativo del negocio |
| `descripcion` | Texto | Tagline corto del negocio |
| `horarios` | Texto | Texto libre de horarios de atención |
| `bienvenida` | Texto largo | Mensaje inicial del bot al abrir el chat |
| `webhook_url` | Texto | URL del webhook de n8n para este rubro |
| `activo` | Booleano | Si es false, muestra pantalla de cuenta suspendida |

**Datos iniciales de ejemplo:**

| nombre | rubro | slug | color_primario | logo_emoji | horarios | webhook_url |
|---|---|---|---|---|---|---|
| Padel Zona Norte | padel | zona-norte | #FF6B6B | 🎾 | 08:00–23:00 | .../webhook/padel |
| Padel Zona Sur | padel | zona-sur | #4ECDC4 | 🏆 | 09:00–22:00 | .../webhook/padel |
| Padel Centro | padel | centro | #45B7D1 | ⚡ | 07:00–23:30 | .../webhook/padel |
| Corte Urbano | peluqueria | corte-urbano | #A855F7 | ✂️ | 09:00–20:00 | .../webhook/peluqueria |

---

## 3. Flujo de datos en el frontend

1. Usuario abre `/padel/zona-norte`
2. Vercel sirve `index.html` (rewrite)
3. React monta, React Router extrae `rubro=padel` y `slug=zona-norte`
4. `ChatApp` hace GET a Baserow filtrando `rubro=padel` y `slug=zona-norte`
5. Baserow responde con la config completa del negocio
6. React aplica colores, logo, título, card del negocio y mensaje de bienvenida
7. Usuario escribe → POST al `webhook_url` del negocio con `{ userMessage, negocioId, rubro, conversationId }`
8. n8n procesa con IA y responde con `{ botResponse }`

**Estados de error manejados:**
- Ruta no encontrada en Baserow → pantalla "Este negocio no existe"
- `activo = false` → pantalla "Cuenta suspendida, contactá al administrador"
- Baserow no responde → pantalla de error con botón de reintentar

---

## 4. UI — Estilo iOS con card de negocio

Rediseño completo de la interfaz con lenguaje visual iOS.

**Estructura de pantalla (de arriba a abajo):**

1. **Nav bar** — fondo `rgba(242,242,247,0.95)` con blur, emoji + nombre del negocio, indicador "En línea" en verde
2. **Business card** — gradiente con el color de marca, muestra horarios y accesos rápidos (Llamar, Ubicación)
3. **Área de mensajes** — fondo `#F2F2F7`, burbujas del bot en blanco con sombra sutil, burbujas del usuario con el color primario de marca
4. **Input bar** — fondo translúcido, campo redondeado, botón de envío con color primario

**Tipografía:** `-apple-system, 'SF Pro Display', sans-serif`  
**Radio de burbujas:** 14px, esquina aguda (4px) en la punta del emisor  
**Typing indicator:** tres puntos grises animados en burbuja blanca

El mismo componente `ChatApp` renderiza correctamente para cualquier rubro: el color de la card, las burbujas del usuario y el botón de envío se toman todos de `color_primario` del negocio.

---

## 5. Webhooks n8n

**Un webhook por rubro:**
- `POST /webhook/padel`
- `POST /webhook/peluqueria`

**Payload enviado por el frontend:**
```json
{
  "userMessage": "Quiero reservar para mañana",
  "negocioId": "zona-norte",
  "rubro": "padel",
  "conversationId": "abc-123"
}
```

**Respuesta esperada del webhook:**
```json
{
  "botResponse": "¡Perfecto! Tenemos cancha 3 disponible..."
}
```

**Estructura interna de n8n:**
```
WF Padel  (/webhook/padel)
  ├── Lógica de disponibilidad de canchas
  ├── Sub-WF: Consultar IA (compartido con todos los rubros)
  └── Sub-WF: Guardar conversación en Baserow (compartido)

WF Peluquería  (/webhook/peluqueria)
  ├── Lógica de agenda de turnos
  ├── Sub-WF: Consultar IA (compartido)
  └── Sub-WF: Guardar conversación en Baserow (compartido)
```

La lógica específica de cada rubro vive en su workflow. Todo lo genérico (IA, persistencia) vive en sub-workflows compartidos para que un fix beneficie a todos los rubros.

---

## 6. Alcance de esta iteración

**Incluido:**
- Migración de query params a React Router con rutas `/:rubro/:slug`
- Tabla `negocios` en Baserow con los 4 registros de ejemplo
- Fetch dinámico de config desde Baserow al cargar el chat
- Rediseño UI estilo iOS (estilo C aprobado en brainstorming)
- Configuración de Vercel para SPA routing
- Negocio de ejemplo: Corte Urbano (peluquería)

**Excluido (próximas iteraciones):**
- Dashboard del dueño
- Panel admin
- Lógica de suscripciones y bloqueo por pago
- Autenticación de usuarios
- Notificaciones push
