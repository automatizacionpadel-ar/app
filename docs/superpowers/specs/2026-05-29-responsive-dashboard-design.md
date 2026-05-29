# Responsive Dashboard & Admin Panel

**Date:** 2026-05-29  
**Scope:** `/dashboard/*` and `/admin/*` panels only. PWA (`/app/[slug]`) is excluded.

---

## Breakpoints

| Range | Behavior |
|---|---|
| `< 768px` (mobile) | Drawer sidebar, full-width content, card views |
| `768px – 1024px` (tablet) | Sidebar colapsado automático (solo iconos, 64px) |
| `> 1024px` (desktop) | Sin cambios — comportamiento actual |

Tailwind breakpoints: `md` = 768px, `lg` = 1024px.

---

## 1. Sidebar

**Problema actual:** `w-[220px]` / `w-[64px]` fijos en todos los tamaños. No existe comportamiento mobile.

**Diseño nuevo:**

- **Mobile (<768px):** El sidebar está oculto por defecto (`hidden md:flex`). Se accede via un botón hamburger en la top bar. Al abrirse, aparece como un drawer sobre el contenido (posición fija, z-50, overlay semitransparente detrás). Se cierra tocando fuera o navegando.
- **Tablet (768–1024px):** El sidebar se muestra siempre colapsado (solo iconos, 64px) sin botón de toggle. El estado de collapsed se fuerza via prop o breakpoint CSS.
- **Desktop (>1024px):** Comportamiento actual (expandible/colapsable con el botón de toggle existente).

**Cambios en Sidebar.tsx:**
- Aceptar props: `isDrawerOpen?: boolean` y `onClose?: () => void`.
- El modo drawer (mobile) se activa solo cuando el componente detecta que está en el layout con `isDrawerOpen` definido. En ese modo el sidebar es `position: fixed, top-0 left-0 h-full z-50`, con transición CSS `translateX(-100%)` → `translateX(0)`.
- En tablet, el estado colapsado se fuerza **via CSS**: el botón de toggle se oculta con `hidden lg:flex`, y el ancho del sidebar se fija a 64px con `md:w-[64px] lg:w-auto`. Así el sidebar siempre está en modo icono en tablet sin necesidad de props extra.
- El estado `isDrawerOpen` se maneja en el layout (useState) y se pasa como prop al Sidebar y al overlay.

---

## 2. Layouts (Dashboard y Admin)

**Problema actual:** `flex h-screen overflow-hidden` sin top bar ni hamburger.

**Diseño nuevo:**

Estructura en mobile:
```
<div className="flex flex-col h-screen">
  <TopBar />         ← solo visible en mobile (md:hidden)
  <div className="flex flex-1 overflow-hidden">
    <Sidebar />      ← hidden en mobile, visible en md+
    <main />
  </div>
  <DrawerOverlay />  ← overlay oscuro cuando drawer está abierto
</div>
```

**TopBar (nuevo componente):** `src/components/layout/TopBar.tsx`
- Solo visible en mobile (`md:hidden`)
- Contiene: botón hamburger (izquierda) + logo/nombre del negocio (centro)
- Background `#2A2A29`, border-bottom `#3D3D3B`, height `h-14`

**DrawerOverlay:** `div` con `fixed inset-0 bg-black/50 z-40` que aparece cuando el drawer está abierto. Click cierra el drawer.

---

## 3. Ancho del contenido

**Problema actual:** `w-[85%] mx-auto` en todas las páginas — en mobile deja márgenes del 7.5% en cada lado (muy ajustado).

**Fix:** Cambiar en todas las páginas el contenedor principal a:
```
className="p-4 md:p-6 md:w-[85%] md:mx-auto"
```

Páginas afectadas:
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/clientes/ClientesCliente.tsx`
- `src/app/dashboard/campanias/CampaniasCliente.tsx`
- `src/app/dashboard/config/ConfigCliente.tsx`
- `src/app/admin/page.tsx`
- Cualquier otro cliente con `w-[85%]`

---

## 4. Grillas de stats

**Problema actual:** `grid-cols-3` fijo en ClientesCliente, sin breakpoint.

**Fix por página:**

| Página | Mobile | Tablet | Desktop |
|---|---|---|---|
| Dashboard (`/dashboard`) | `grid-cols-2` | `grid-cols-2` | `grid-cols-4` |
| Clientes stats | `grid-cols-1` | `grid-cols-3` | `grid-cols-3` |
| Admin stats | `grid-cols-2` | `grid-cols-2` | `grid-cols-3` |

Clases Tailwind resultantes:
- Dashboard: `grid-cols-2 lg:grid-cols-4` (ya correcto, mantener)
- Clientes: `grid-cols-1 md:grid-cols-3` (cambiar de `grid-cols-3`)
- Admin: `grid-cols-2 lg:grid-cols-3` (ya correcto, mantener)

---

## 5. Tablas → Vista de tarjetas en mobile

Las tablas y listas de filas se reemplazan por tarjetas en mobile. En tablet y desktop se mantiene la vista actual.

### ClientesCliente.tsx — lista de clientes

**Mobile:** Cada `FilaCliente` se renderiza como tarjeta:
```
<div class="bg-[#2A2A29] rounded-xl p-4 border border-[#3D3D3B]">
  <div class="flex justify-between items-start">
    <div>nombre + teléfono</div>
    <badge estado />
  </div>
  <div class="flex gap-4 mt-2 text-sm text-[#9A9A96]">
    <span>última visita</span>
    <span>citas</span>
  </div>
</div>
```

**Implementación:** Usar `md:hidden` en el contenedor de tarjetas y `hidden md:block` en el contenedor de filas originales. Reutilizar los mismos datos, solo cambiar la presentación.

### Admin page.tsx — tabla de negocios/clientes

**Mobile:** Reemplazar `<table>` por lista de tarjetas con `md:hidden`. Cada tarjeta muestra: nombre del negocio, plan (badge), MRR, estado.

**Tablet/Desktop:** La tabla existente con `overflow-x-auto` se mantiene (`hidden md:block`).

---

## 6. Barra de búsqueda y filtros (Clientes)

**Problema actual:** `flex gap-3` — en mobile el select y el input quedan muy apretados.

**Fix:** En mobile, apilar verticalmente:
```
className="flex flex-col md:flex-row gap-3 mb-4"
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/components/layout/Sidebar.tsx` | Drawer mode, `forceCollapsed` prop, ocultar toggle en tablet |
| `src/components/layout/TopBar.tsx` | **NUEVO** — hamburger + logo, solo mobile |
| `src/app/dashboard/layout.tsx` | Agregar TopBar, estado drawer, overlay |
| `src/app/admin/layout.tsx` | Ídem |
| `src/app/dashboard/page.tsx` | Fix `w-[85%]` → responsive |
| `src/app/dashboard/clientes/ClientesCliente.tsx` | Fix grid stats, card view mobile, fix search row |
| `src/app/dashboard/campanias/CampaniasCliente.tsx` | Fix `w-[85%]` → responsive |
| `src/app/admin/page.tsx` | Fix `w-[85%]`, card view mobile para tabla |

---

## Lo que NO cambia

- PWA (`/app/[slug]`, `/app/[slug]/chat`) — no se toca
- Diseño visual (colores, tipografía, iconos) — sin cambios
- Comportamiento desktop — sin cambios
- Modales — ya usan `max-w-sm` que funciona bien en mobile
