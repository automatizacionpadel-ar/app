# Spec: Página de Configuración del Médico

**Fecha:** 2026-05-22

## Contexto

Los médicos (clientes de SimplificIA) necesitan poder gestionar su propia configuración desde el dashboard. Actualmente la ruta `/dashboard/config` existe en el sidebar pero no tiene implementación. Se construye la página con tres secciones apiladas y un único botón "Guardar cambios" al final.

## Layout

Secciones apiladas en scroll vertical (`flex-col gap-6`), cada una en su propia card (`background: #2A2A29`). Botón único "Guardar cambios" abajo a la derecha, fuera de las cards.

---

## Sección 1 — Información Personal

Campos apilados verticalmente:
- **Foto de perfil** — avatar circular con botón "Subir imagen". Upload a Supabase Storage en `medico-fotos/<medico_id>/avatar.jpg`. Guarda URL en `medicos.foto_perfil_url`.
- **Logo del consultorio** — preview cuadrado/redondeado con botón "Subir imagen". Upload a `medico-fotos/<medico_id>/logo.jpg`. Guarda URL en `medicos.logo_url`.
- **Nombre completo** — `medicos.nombre_completo` (text input)
- **Celular** — `medicos.telefono` (text input)
- **Dirección del consultorio** — `medicos.direccion` (text input)

---

## Sección 2 — Horarios de Atención

Mismo patrón visual que el formulario de creación de médico (`/admin/medicos/nuevo`):
- Chips de días (L M Mi J V S D) como toggles — verde activo, gris inactivo
- Por cada día activo: dos inputs de hora `inicio` y `fin` con separador "a"
- Días inactivos muestran texto "Descanso"
- Datos en `medicos.horarios` (columna JSONB existente)

---

## Sección 3 — Propiedades de Citas

**Campos:**
- **Precio de la consulta** — nuevo campo `medicos.precio_consulta` (numeric). Input con prefijo `$`.
- **Requerir seña** — toggle que controla `medicos.requiere_sena` (boolean). Cuando está ON, muestra campo "Monto de la seña" (`medicos.monto_sena`).
- **Aceptar nuevos agendamientos** — nuevo campo `medicos.acepta_agendamientos` (boolean, DEFAULT true). Toggle. Cuando está OFF, el agente IA rechaza nuevos turnos.

---

## Nuevos campos en DB (`medicos`)

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `foto_perfil_url` | text | null | URL pública foto de perfil (Storage) |
| `logo_url` | text | null | URL pública logo del consultorio (Storage) |
| `precio_consulta` | numeric(10,2) | null | Precio total de la consulta |
| `acepta_agendamientos` | boolean | true | Si el médico acepta nuevos turnos |

Migración: `supabase migration new config_medico_fields`

---

## Supabase Storage

Nuevo bucket `medico-fotos` (público para lectura).

**Política RLS Storage:**
- INSERT/UPDATE: `auth.uid() = (SELECT usuario_id FROM medicos WHERE id = medico_id)`
- SELECT: público

**Flujo de upload:**
1. Usuario selecciona imagen en el cliente
2. Client SDK sube a `medico-fotos/<medico_id>/avatar.jpg` (reemplaza si ya existe)
3. Se obtiene la URL pública y se guarda en el state local
4. Al guardar el formulario, la URL se envía junto con los demás campos

---

## Arquitectura de archivos

```
src/app/dashboard/config/
  page.tsx          ← server component: carga datos del médico, pasa a cliente
  ConfigCliente.tsx ← client component: maneja estado del formulario y submit
```

**API:** `PATCH /api/medicos/actualizar` (nuevo endpoint)
- Recibe: `{ nombre_completo, telefono, direccion, foto_perfil_url, logo_url, horarios, precio_consulta, requiere_sena, monto_sena, acepta_agendamientos }`
- Verifica que el `usuario_id` del médico coincida con `auth.uid()`
- Hace `UPDATE medicos SET ... WHERE id = medico_id`
- Responde `{ ok: true }` o `{ error: "..." }`

---

## Comportamiento del formulario

- **Estado inicial:** campos pre-cargados con los datos actuales del médico
- **Guardado:** un solo botón "Guardar cambios" (abajo derecha) envía todos los campos juntos en un PATCH
- **Loading:** botón muestra "Guardando..." y se deshabilita durante el submit
- **Éxito:** toast/mensaje verde "Cambios guardados" durante 3 segundos
- **Error:** mensaje rojo debajo del botón con el texto del error

---

## Verificación

1. Login como médico → navegar a `/dashboard/config`
2. Cambiar foto, nombre, celular, dirección → Guardar → recargar → verificar persistencia
3. Editar horarios (activar/desactivar días, cambiar horas) → Guardar → verificar en DB
4. Cambiar precio consulta, toggle seña, toggle agendamientos → Guardar → verificar en DB
5. Desactivar "Aceptar agendamientos" → verificar que el campo `acepta_agendamientos = false` en Supabase
