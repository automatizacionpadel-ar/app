# SimplificIA Dashboard

Panel de gestión para consultorios médicos. Construido con Next.js 14, Supabase y FullCalendar.

## Stack

- **Next.js 14** — App Router
- **Supabase** — Base de datos, Auth, Realtime
- **FullCalendar** — Vista de calendario con tiempo real
- **Tailwind CSS** — Estilos
- **TypeScript** — Tipado estático

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Generar claves VAPID para push notifications
npx web-push generate-vapid-keys
# Copiar las claves generadas en .env.local

# 4. Ejecutar en desarrollo
npm run dev
```

## Estructura

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Dashboard principal (stats + citas del día)
│   │   ├── layout.tsx            # Layout con sidebar
│   │   ├── calendario/           # Vista de calendario con Realtime
│   │   ├── pacientes/            # Lista de pacientes
│   │   ├── campanias/            # Campañas promocionales push
│   │   └── config/               # Configuración del médico
│   ├── admin/
│   │   └── medicos/              # Panel superadmin (alta de médicos)
│   │       └── nuevo/            # Formulario de nuevo médico
│   ├── login/                    # Página de autenticación
│   └── api/                      # API Routes (MP, push, etc.)
├── components/
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   └── supabase/
│       ├── client.ts             # Cliente browser
│       └── server.ts             # Cliente server + admin
├── types/
│   └── index.ts                  # Tipos TypeScript globales
└── middleware.ts                 # Protección de rutas
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada (solo server-side) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID para push |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `VAPID_EMAIL` | Email para identificación VAPID |

## Sprints

- ✅ Sprint 1 — Schema Supabase
- ✅ Sprint 2 — Workflows n8n adaptados
- ✅ Sprint 3 — Dashboard base (login, sidebar, stats, calendario)
- 🔜 Sprint 4 — Pacientes, campañas, panel admin
- 🔜 Sprint 5 — PWA + push notifications
- 🔜 Sprint 6 — Edge Functions recordatorios
