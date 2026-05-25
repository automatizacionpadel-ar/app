# Generalización Multi-Rubro — Design Spec

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar SimplificIA de una plataforma exclusivamente médica a una plataforma genérica que sirva a cualquier rubro (tatuadores, veterinarios, mueblerías, etc.) manteniendo las mismas funcionalidades core: agendamiento de citas, chat con IA y campañas de push.

**Architecture:** Renombrar entidades en DB, código y rutas — sin cambios en la lógica de negocio. El feature de recetas queda como opcional, activable solo por superadmin, desactivado por defecto.

**Tech Stack:** Next.js 14, Supabase (PostgreSQL), TypeScript, n8n

---

## 1. Base de datos

### Tablas a renombrar
| Actual | Nuevo |
|---|---|
| `medicos` | `negocios` |
| `pacientes` | `clientes` |
| `medico_agente_config` | `negocio_agente_config` |
| `medico_faqs` | `negocio_faqs` |

### Columnas a renombrar
Aplica en todas las tablas que las contienen (`citas`, `clientes`, `push_subscriptions`, `recetas`, `suscripciones`, `notificaciones_log`, `chat_sessions`, `negocio_agente_config`, `negocio_faqs`):

| Actual | Nuevo |
|---|---|
| `medico_id` | `negocio_id` |
| `negocios.especialidad` | `negocios.rubro` |
| `negocios.nombre_completo` | `negocios.nombre` |
| `citas.motivo_consulta` | `citas.motivo` |
| `citas.notas_medico` | `citas.notas` |

### Valor de rol
```sql
-- usuarios.rol: cambiar todos los registros existentes
UPDATE usuarios SET rol = 'negocio' WHERE rol = 'medico';
-- Actualizar el CHECK constraint si existe
```

### Campo nuevo
```sql
ALTER TABLE negocios ADD COLUMN habilitar_recetas boolean NOT NULL DEFAULT false;
```
- Solo el superadmin puede modificar este campo desde `/admin/negocios`
- `sello_url` y `firma_url` permanecen en `negocios` (se usan únicamente cuando `habilitar_recetas = true`)

### RLS y políticas
Todas las políticas RLS que referencian `medico_id` deben actualizarse a `negocio_id`. Las que chequean `rol = 'medico'` deben pasar a `rol = 'negocio'`.

---

## 2. TypeScript Types (`src/types/index.ts`)

| Actual | Nuevo |
|---|---|
| `Rol: 'medico'` | `Rol: 'negocio'` |
| `interface Medico` | `interface Negocio` |
| `interface Paciente` | `interface Cliente` |
| `interface MedicoAgenteConfig` | `interface NegocioAgenteConfig` |
| `interface MedicoFaq` | `interface NegocioFaq` |
| `interface FormMedicoNuevo` | `interface FormNegocioNuevo` |
| `interface CitaConPaciente` | `interface CitaConCliente` |
| Propiedad `medico_id` en todas las interfaces | `negocio_id` |
| `Medico.especialidad` | `Negocio.rubro` |
| `Medico.nombre_completo` | `Negocio.nombre` |
| `Cita.motivo_consulta` | `Cita.motivo` |
| `Cita.notas_medico` | `Cita.notas` |
| `Negocio.habilitar_recetas` | agregar `habilitar_recetas: boolean` |

---

## 3. Rutas API

### Renombrar directorios y archivos
| Actual | Nuevo |
|---|---|
| `src/app/api/medicos/crear/route.ts` | `src/app/api/negocios/crear/route.ts` |
| `src/app/api/medicos/actualizar/route.ts` | `src/app/api/negocios/actualizar/route.ts` |
| `src/app/api/medicos/publico/route.ts` | `src/app/api/negocios/publico/route.ts` |
| `src/app/api/pacientes/registrar/route.ts` | `src/app/api/clientes/registrar/route.ts` |
| `src/app/api/sesion/paciente/route.ts` | `src/app/api/sesion/cliente/route.ts` |

### Actualizaciones internas en cada route
- Queries de Supabase: `.from('medicos')` → `.from('negocios')`, `.from('pacientes')` → `.from('clientes')`
- Columnas: `medico_id` → `negocio_id`, `especialidad` → `rubro`, `nombre_completo` → `nombre`
- `/api/chat/route.ts`: lookup interno de `medicos` → `negocios`
- `/api/citas/crear/route.ts`: todas las referencias a `pacientes` → `clientes`, `medico_id` → `negocio_id`
- `/api/citas/disponibles/route.ts`: ídem
- `/api/campanias/enviar/route.ts`: `medico_id` → `negocio_id`, tabla `pacientes` → `clientes`
- `/api/push/enviar/route.ts`: `medico_id` → `negocio_id`, tabla `pacientes` → `clientes`
- `/api/recetas/crear/route.ts`: `medico_id` → `negocio_id`, `paciente_id` → `cliente_id` (en tabla recetas)

---

## 4. Dashboard (`/dashboard/*`)

### Ruta a renombrar
| Actual | Nuevo |
|---|---|
| `src/app/dashboard/pacientes/` | `src/app/dashboard/clientes/` |

Archivos afectados: `page.tsx`, `ClientesCliente.tsx` (era `PacientesCliente.tsx`), `RecetaModal.tsx`

### Cambios en todos los archivos del dashboard
- Imports: `Medico` → `Negocio`, `Paciente` → `Cliente`, etc.
- Queries Supabase: tabla `medicos` → `negocios`, `pacientes` → `clientes`
- Props y variables: `medicoId` → `negocioId`, `medicoInfo` → `negocioInfo`
- Labels en UI: "Médico", "Paciente", "Especialidad" → "Negocio", "Cliente", "Rubro"

### Recetas — control por `habilitar_recetas`
- `ClientesCliente.tsx`: el botón "Nueva receta" solo renderiza si `negocio.habilitar_recetas === true`
- `RecetaModal.tsx`: sin cambios en lógica, solo renombrar referencias de tipos

### Sidebar (`src/components/layout/Sidebar.tsx`)
- Label "Pacientes" → "Clientes", href `/dashboard/pacientes` → `/dashboard/clientes`
- El resto del sidebar no cambia

---

## 5. Admin panel (`/admin/*`)

### Rutas a renombrar
| Actual | Nuevo |
|---|---|
| `src/app/admin/medicos/` | `src/app/admin/negocios/` |
| `src/app/admin/medicos/nuevo/` | `src/app/admin/negocios/nuevo/` |

### Cambios en admin
- `src/app/admin/page.tsx`: queries de `medicos` → `negocios`, labels de UI
- `src/app/admin/negocios/page.tsx`: tabla de negocios, agregar columna/toggle "Recetas" (solo visible para superadmin)
- `src/app/admin/negocios/nuevo/page.tsx`: form usa `negocio_id`, llama a `/api/negocios/crear`
- `src/app/admin/layout.tsx`: sin cambios de lógica

### Toggle de recetas en `/admin/negocios`
- Columna "Recetas" en la tabla de negocios con un toggle on/off
- Al cambiar, hace PATCH a `/api/negocios/actualizar` con `{ habilitar_recetas: true/false }`
- Solo visible y funcional para `rol = 'superadmin'`

---

## 6. Auth y Middleware

### `src/middleware.ts`
```ts
// Antes
if (rol === 'medico') redirect('/dashboard')
// Después
if (rol === 'negocio') redirect('/dashboard')
```

### `src/app/dashboard/layout.tsx`
```ts
// Antes
if (usuario.rol !== 'medico') redirect('/login')
// Después
if (usuario.rol !== 'negocio') redirect('/login')
```

### `src/app/login/page.tsx`
```ts
// Antes
if (rol === 'medico') router.push('/dashboard')
// Después
if (rol === 'negocio') router.push('/dashboard')
```

---

## 7. n8n Workflow (`BGj5q2FB9UhqOhMS`)

### Nodos afectados
- **"Construir prompt"** (Code node): variable `medico_id` → `negocio_id` en el output JSON
- **"Cargar config médico"** (HTTP Request): URL y columnas de query — `medicos` → `negocios`, `especialidad` → `rubro`, `nombre_completo` → `nombre`
- **"Médico existe?"** → renombrar nodo a **"Negocio existe?"** (lógica sin cambios)
- **"Registrar cliente"** (era "Registrar paciente"): URL ya apunta a `/api/clientes/registrar`
- **"Buscar paciente"** → renombrar a **"Buscar cliente"**: query a tabla `clientes`
- **"Responder al chat"**: campo `medico_id` → `negocio_id` en el body

### PWA (`/app/[slug]`)
Sin cambios — los textos vienen del prompt dinámico generado por `negocio_agente_config`.

---

## 8. Orden de implementación recomendado

1. **Migración DB** — renombrar tablas, columnas, actualizar rol, agregar `habilitar_recetas`, actualizar RLS
2. **TypeScript types** — refactor `src/types/index.ts`
3. **API routes** — mover directorios + actualizar queries internas
4. **Dashboard** — renombrar ruta `pacientes` → `clientes`, actualizar todos los archivos
5. **Admin panel** — renombrar ruta `medicos` → `negocios`, agregar toggle de recetas
6. **Auth/middleware** — cambiar chequeos de rol
7. **n8n workflow** — actualizar nodos via API

---

## 9. Lo que NO cambia

- Lógica de negocio de citas, push, campañas
- Estructura de la PWA `/app/[slug]` y el chat
- Panel admin en general (estructura, métricas)
- Webhook token y autenticación de n8n
- `recetas` Storage bucket y generación de PDFs (solo se desactiva el acceso por UI)
