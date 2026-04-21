# Prompt para Claude Code - PWA Chat Multi-Complejo Simplificia

Copia y pega este prompt completo en Claude Code para que genere toda la PWA.

---

## INICIO DEL PROMPT

Necesito que me generes una **Progressive Web App (PWA) completa** para un sistema de chat de reservas de canches de pádel. Los requisitos son:

### 🎯 Objetivo Principal
Crear una SPA (Single Page Application) tipo ChatGPT que:
- Funcione como una app instalable en celular (Android e iOS)
- Soporte múltiples complejos de pádel, cada uno con su propia interfaz
- Se conecte con webhooks de n8n para procesar mensajes
- Funcione offline usando Service Worker

### 📱 Requisitos de Diseño Mobile-First

1. **Interfaz Chat tipo ChatGPT**
   - Header personalizado por complejo con icono y nombre
   - Área de mensajes con scroll suave
   - Mensaje del usuario alineado a la derecha (fondo con color del complejo)
   - Mensaje del bot alineado a la izquierda (fondo gris claro)
   - Typing indicator (3 puntitos animados) cuando el bot responde
   - Input expandible con botón de envío
   - Touch-friendly (mínimo 44px de altura en botones)

2. **Soporte Multi-Complejo**
   - Cada complejo accede por URL: `/?complex_id=zona_norte`
   - Cada complejo tiene su propio:
     - Icono/favicon distinto
     - Nombre único
     - Color de tema personalizado
     - Manifest.json diferente
   - Los complejos son: `zona_norte`, `zona_sur`, `centro`
   - Datos de los complejos:
     ```
     zona_norte:
       - nombre: "Padel Zona Norte"
       - color: "#FF6B6B" (rojo)
       - logo: "🎾"
       - descripción: "Reserva tus canches"
       - horarios: 08:00 - 23:00
     
     zona_sur:
       - nombre: "Padel Zona Sur"
       - color: "#4ECDC4" (celeste)
       - logo: "🏆"
       - descripción: "Las mejores canches del sur"
       - horarios: 09:00 - 22:00
     
     centro:
       - nombre: "Padel Centro"
       - color: "#45B7D1" (azul)
       - logo: "⚡"
       - descripción: "Centro de la ciudad"
       - horarios: 07:00 - 23:30
     ```

3. **PWA Features**
   - Cambiar dinámicamente: favicon, title, theme-color, manifest.json según complex_id
   - Service Worker que cachea assets y permite offline
   - Instalable en Android: menú → "Instalar app"
   - Instalable en iOS: Safari → compartir → "Agregar a pantalla de inicio"
   - Soporte para safe-area (notch, home indicator)

4. **Integración n8n**
   - Enviar POST a `https://n8n.simplificia.com.ar/webhook/chat`
   - Payload: `{ userMessage, complexId, conversationId }`
   - Respuesta esperada: `{ botResponse }`
   - Manejo de errores con reintentos y mensajes claros

5. **Almacenamiento Local**
   - Guardar historial de mensajes en localStorage por complejo
   - Clave: `chat_{complex_id}`
   - Persistir conversaciones entre sesiones
   - Opción para limpiar historial

### 🎨 Diseño y Estilos

1. **Theming**
   - Usar CSS variables para colores dinámicos
   - Cada complejo cambia el color del header, botón de envío, etc.
   - Soporte para dark mode (prefers-color-scheme)

2. **Responsive**
   - Diseñado para 375px (iPhone SE) como mínimo
   - Funciona en escritorio también pero optimizado para mobile
   - Sin scroll horizontal
   - Padding para safe areas (notch, home indicator)

3. **Animaciones**
   - Fade-in suave de mensajes
   - Typing indicator en el bot
   - Efecto de presión en botones
   - Respetar prefers-reduced-motion

4. **Accesibilidad**
   - Colores con contraste WCAG AA
   - Etiquetas descriptivas
   - Semantic HTML
   - Focus visible en inputs

### 📦 Stack Técnico

- **Frontend**: React 18 + Vite
- **Estilos**: CSS puro (sin Tailwind, estilos inline)
- **PWA**: Service Worker nativo + Manifest JSON
- **Almacenamiento**: localStorage
- **Networking**: Fetch API

### 📁 Estructura de Carpetas

```
src/
├── ChatApp.jsx              (Componente principal, lógica)
├── ChatApp.css              (Estilos globales)
├── main.jsx                 (Entry point)
├── components/
│   ├── ChatHeader.jsx       (Header personalizado)
│   ├── ChatMessages.jsx     (Área de mensajes)
│   └── ChatInput.jsx        (Input y botón enviar)
└── service-worker.js        (Service Worker)

public/
├── index.html               (HTML con todas las meta tags PWA)
├── service-worker.js        (Copia del SW)
├── favicons/
│   ├── favicon_zona_norte_192.png
│   ├── favicon_zona_norte_512.png
│   ├── favicon_zona_sur_192.png
│   ├── favicon_zona_sur_512.png
│   ├── favicon_centro_192.png
│   └── favicon_centro_512.png
└── manifests/
    ├── manifest_zona_norte.json
    ├── manifest_zona_sur.json
    └── manifest_centro.json

vite.config.js
package.json
```

### 🛠️ Requisitos Técnicos Específicos

1. **ChatApp.jsx**
   - Leer `complex_id` de URL query params
   - Cambiar favicon, title, theme-color, manifest dinámicamente
   - Cargar datos del complejo
   - Mostrar mensaje de bienvenida personalizado
   - Manejar envío de mensajes a n8n
   - Guardar/cargar historial de localStorage
   - Auto-scroll a nuevos mensajes

2. **Service Worker**
   - Estrategia "Network First" para webhooks
   - Estrategia "Cache First" para assets
   - Fallback offline graceful
   - Actualizar caché automáticamente

3. **Manifests JSON**
   - Un manifest.json por complejo
   - start_url debe incluir el complex_id
   - Theme color personalizado
   - Icons (192x192 y 512x512)
   - Display: standalone

4. **HTML Meta Tags**
   - `<meta name="theme-color" content="...">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
   - `<link rel="manifest" href="...">`
   - `<link rel="apple-touch-icon" href="...">`
   - Favicon dinámico
   - Viewport con viewport-fit=cover para safe area

5. **Vite Config**
   - Build optimizado (minify, source maps)
   - Dev server en 0.0.0.0:5173
   - Service Worker register automático

### ✨ Comportamiento

1. **Primera vez que abre la app**
   - Detecta complex_id de URL
   - Si no hay complex_id, mostrar error
   - Cargar datos del complejo
   - Mostrar mensaje de bienvenida del bot
   - Registrar Service Worker

2. **Usuario escribe y envía mensaje**
   - Agregar mensaje a la lista (lado derecho, color del tema)
   - Deshabilitar input y mostrar estado "enviando"
   - Enviar POST a n8n con userMessage, complexId
   - Mostrar typing indicator
   - Recibir respuesta y mostrar mensaje del bot
   - Guardar mensajes en localStorage
   - Auto-scroll al nuevo mensaje

3. **Si falla la conexión**
   - Mostrar error temporal
   - Sugerir reintentar
   - No borrar los mensajes

4. **Instalación como app**
   - En Android: aparece "Instalar app" en menú
   - En iOS: aparece "Agregar a pantalla de inicio"
   - Al abrir desde pantalla de inicio, se ve como app nativa
   - Usa el icono y nombre del complejo

### 📝 Notas Importantes

- NO usar librerías externas excepto React y Vite
- Todos los estilos en CSS puro
- Service Worker en vanilla JS
- Componentes React funcionales
- Manejo de errores robusto
- Logs en consola para debugging

### 🎯 Resultado Final

Una PWA profesional, instalable, multi-complejo, que funcione offline y se conecte con n8n para procesamiento de mensajes. Debe verse como una app nativa en celular.

---

## FIN DEL PROMPT

---

## 📋 Cómo usar este prompt

1. Abre Claude Code
2. Copia TODO el contenido entre "INICIO DEL PROMPT" y "FIN DEL PROMPT"
3. Pégalo en Claude Code
4. Claude generará automáticamente:
   - ChatApp.jsx con toda la lógica
   - Componentes de chat
   - Service Worker
   - Estilos CSS
   - package.json y vite.config.js
   - HTML con todas las meta tags PWA
   - Manifest JSON files (como ejemplo)

5. Una vez generado:
   ```bash
   npm install
   npm run dev
   ```

6. Accede a `http://localhost:5173/?complex_id=zona_norte`

---

## 💡 Variaciones que puedes hacer

Si quieres agregar más cosas después, puedes pedir:

- "Agrega autenticación con usuario/email"
- "Agregar almacenamiento en Baserow"
- "Integración con Mercado Pago para pagos"
- "Historial de reservas"
- "Calendario de disponibilidad"
- "Notificaciones push"
- "Dark mode toggle manual"
- "Opción de compartir chat por WhatsApp"

---

**Listo para copiar y pegar en Claude Code!** 🚀
