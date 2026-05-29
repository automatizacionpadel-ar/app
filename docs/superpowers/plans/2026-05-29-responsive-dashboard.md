# Responsive Dashboard & Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer responsive el panel `/dashboard/*` y `/admin/*` con soporte para mobile (drawer), tablet (sidebar colapsado auto) y desktop (sin cambios).

**Architecture:** Se crea un `DashboardShell` client component que maneja el estado del drawer, envuelve el Sidebar y la nueva TopBar. El Sidebar recibe props de drawer y usa CSS responsive para adaptarse a los tres tamaños. Las tablas de datos en mobile se reemplazan por vistas de tarjetas.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Lucide React, clsx. Sin librerías nuevas.

---

## Archivos

| Acción | Ruta |
|---|---|
| Crear | `src/components/layout/TopBar.tsx` |
| Crear | `src/components/layout/DashboardShell.tsx` |
| Modificar | `src/components/layout/Sidebar.tsx` |
| Modificar | `src/app/dashboard/layout.tsx` |
| Modificar | `src/app/admin/layout.tsx` |
| Modificar | `src/app/dashboard/page.tsx` (línea ~77) |
| Modificar | `src/app/dashboard/clientes/ClientesCliente.tsx` (líneas ~200, 213, 228, 130–165) |
| Modificar | `src/app/dashboard/campanias/CampaniasCliente.tsx` (línea ~456) |
| Modificar | `src/app/dashboard/config/ConfigCliente.tsx` (línea ~408) |
| Modificar | `src/app/admin/page.tsx` (línea ~126, 203–254) |

---

## Task 1: Crear TopBar (mobile header con hamburger)

**Files:**
- Create: `src/components/layout/TopBar.tsx`

- [ ] **Crear el archivo TopBar.tsx**

```tsx
// src/components/layout/TopBar.tsx
'use client'

import { Menu } from 'lucide-react'
import Image from 'next/image'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header
      className="md:hidden flex items-center gap-3 h-14 px-4 flex-shrink-0"
      style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg"
        style={{ color: '#9A9A96' }}
        aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <Image src="/logo.png" alt="SimplificIA" width={110} height={29} priority />
    </header>
  )
}
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: add mobile TopBar with hamburger button"
```

---

## Task 2: Actualizar Sidebar para soporte de drawer y tablet

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

El Sidebar debe:
- En mobile: ser un drawer fijo (`position: fixed`, fuera del flujo), que se abre/cierra via `isDrawerOpen`
- En tablet (md): volver al flujo (`sticky`), siempre icon-only (64px), sin toggle button
- En desktop (lg): respetar el estado `collapsed` con toggle button visible

- [ ] **Reemplazar el contenido completo de Sidebar.tsx**

```tsx
// src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import {
  LayoutDashboard, MessageSquare, Users, Megaphone,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Briefcase, X,
} from 'lucide-react'

interface NavItem {
  label:        string
  href:         string
  icon:         React.ReactNode
  adminOnly?:   boolean
  clienteOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',             icon: <LayoutDashboard size={18} /> },
  { label: 'Mensajería',  href: '/dashboard/mensajeria', icon: <MessageSquare size={18} />, clienteOnly: true },
  { label: 'Clientes',    href: '/dashboard/clientes',   icon: <Users size={18} />,         clienteOnly: true },
  { label: 'Campañas',    href: '/dashboard/campanias',  icon: <Megaphone size={18} />,     clienteOnly: true },
  { label: 'Negocios',    href: '/admin/negocios',       icon: <Briefcase size={18} />,     adminOnly: true },
  { label: 'Configuración', href: '/dashboard/config',   icon: <Settings size={18} />,      clienteOnly: true },
]

interface SidebarProps {
  rol:           string
  nombreNegocio?: string
  isDrawerOpen?: boolean
  onClose?:      () => void
}

export default function Sidebar({ rol, nombreNegocio, isDrawerOpen, onClose }: SidebarProps) {
  const pathname  = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isAdmin = rol === 'superadmin'
  const items = NAV_ITEMS
    .filter(item => !item.adminOnly  || isAdmin)
    .filter(item => !item.clienteOnly || !isAdmin)
    .map(item =>
      item.href === '/dashboard' && isAdmin
        ? { ...item, href: '/admin' }
        : item
    )

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen z-50 flex-shrink-0 transition-all duration-300',
        // Mobile: fixed drawer, slide in/out
        'fixed inset-y-0 left-0',
        'transition-transform',
        isDrawerOpen ? 'translate-x-0' : '-translate-x-full',
        // Tablet+: back to normal flow, always 64px, always visible
        'md:sticky md:top-0 md:translate-x-0 md:w-[64px]',
        // Desktop: respect collapsed state
        collapsed ? 'lg:w-[64px]' : 'lg:w-[220px]',
        // Mobile drawer width
        'w-[220px]',
      )}
      style={{ background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>

      {/* Logo row */}
      <div
        className={clsx(
          'flex items-center h-16 px-4 flex-shrink-0',
          // Mobile: logo left, X button right
          'justify-between',
          // Tablet: center (no logo)
          'md:justify-center',
          // Desktop: respect collapsed
          !collapsed ? 'lg:justify-between' : 'lg:justify-center',
        )}
        style={{ borderBottom: '1px solid #3D3D3B' }}>

        {/* Logo: visible on mobile and desktop-expanded */}
        <Image
          src="/logo.png"
          alt="SimplificIA"
          width={130}
          height={34}
          priority
          className={clsx('block md:hidden', !collapsed && 'lg:block')}
        />

        {/* Close button: mobile drawer only */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex md:hidden p-1.5 rounded-lg"
            style={{ color: '#5C5C59' }}
            aria-label="Cerrar menú">
            <X size={18} />
          </button>
        )}

        {/* Toggle button: desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex rounded-lg p-1.5 transition-colors"
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#7AB619')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Negocio info: mobile + desktop-expanded only */}
      {nombreNegocio && (
        <div
          className={clsx(
            'px-4 py-3 flex-shrink-0 block md:hidden',
            !collapsed ? 'lg:block' : 'lg:hidden',
          )}
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <p className="text-xs" style={{ color: '#5C5C59' }}>
            {isAdmin ? 'Administrador' : 'Negocio'}
          </p>
          <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>
            {nombreNegocio}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(item => {
          const dashboardRoot = item.href === '/dashboard' || item.href === '/admin'
          const active = pathname === item.href ||
            (!dashboardRoot && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={clsx(
                'flex items-center gap-3 rounded-lg py-2.5 px-3 text-sm font-medium transition-all',
                // Tablet: center icon
                'md:justify-center md:px-2',
                // Desktop: respect collapsed
                collapsed ? 'lg:justify-center lg:px-2' : 'lg:justify-start lg:px-3',
              )}
              style={{
                color:      active ? '#7AB619' : '#9A9A96',
                background: active ? 'rgba(122,182,25,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(122,182,25,0.05)'; e.currentTarget.style.color = '#F0F0EE' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9A96' } }}
              title={item.label}>
              {item.icon}
              {/* Text: visible on mobile and desktop-expanded, hidden on tablet */}
              <span className={clsx(
                'inline md:hidden',
                !collapsed ? 'lg:inline' : 'lg:hidden',
              )}>
                {item.label}
              </span>
              {/* Admin badge */}
              {item.adminOnly && (
                <span
                  className={clsx('ml-auto text-[10px] rounded px-1.5 py-0.5 font-semibold inline md:hidden', !collapsed ? 'lg:inline' : 'lg:hidden')}
                  style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                  Admin
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid #3D3D3B' }}>
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg py-2.5 px-3 text-sm transition-all',
            'md:justify-center md:px-2',
            collapsed ? 'lg:justify-center lg:px-2' : 'lg:justify-start lg:px-3',
          )}
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5C59'; e.currentTarget.style.background = 'transparent' }}
          title="Cerrar sesión">
          <LogOut size={18} />
          <span className={clsx('inline md:hidden', !collapsed ? 'lg:inline' : 'lg:hidden')}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: sidebar supports mobile drawer and tablet auto-collapse"
```

---

## Task 3: Crear DashboardShell (wrapper client para estado del drawer)

Los layouts de dashboard y admin son Server Components — no pueden usar `useState`. El Shell es un Client Component que maneja el estado del drawer.

**Files:**
- Create: `src/components/layout/DashboardShell.tsx`

- [ ] **Crear DashboardShell.tsx**

```tsx
// src/components/layout/DashboardShell.tsx
'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardShellProps {
  rol:           string
  nombreNegocio: string
  children:      React.ReactNode
}

export default function DashboardShell({ rol, nombreNegocio, children }: DashboardShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        rol={rol}
        nombreNegocio={nombreNegocio}
        isDrawerOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Overlay oscuro detrás del drawer en mobile */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat: DashboardShell client wrapper manages mobile drawer state"
```

---

## Task 4: Actualizar dashboard/layout.tsx para usar DashboardShell

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Reemplazar el contenido de dashboard/layout.tsx**

```tsx
// src/app/dashboard/layout.tsx
import { getAuthSession } from '@/lib/auth'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { rol, negocio, user } = await getAuthSession()

  const nombreNegocio = rol === 'negocio'
    ? (negocio?.nombre ?? user.email ?? '')
    : 'Super Admin'

  return (
    <DashboardShell rol={rol} nombreNegocio={nombreNegocio}>
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "refactor: dashboard layout uses DashboardShell"
```

---

## Task 5: Actualizar admin/layout.tsx para usar DashboardShell

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Reemplazar el contenido de admin/layout.tsx**

```tsx
// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()

  if (!usuario || usuario.rol !== 'superadmin') redirect('/dashboard')

  return (
    <DashboardShell rol="superadmin" nombreNegocio="Super Admin">
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Verificar el layout en el navegador**

Arrancar `npm run dev` y navegar a `/dashboard`. Verificar:
- Desktop (>1024px): sidebar visible con texto, toggle button presente
- Tablet (768–1024px): sidebar con solo iconos, sin toggle, sin texto
- Mobile (<768px): sin sidebar, con TopBar (logo + hamburger), al presionar hamburger el drawer se abre sobre el contenido

- [ ] **Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "refactor: admin layout uses DashboardShell"
```

---

## Task 6: Corregir ancho del contenido en todas las páginas

Cambiar `p-6 w-[85%] mx-auto` → `p-4 md:p-6 md:w-[85%] md:mx-auto` en los cuatro archivos afectados.

**Files:**
- Modify: `src/app/dashboard/page.tsx` (línea ~77)
- Modify: `src/app/dashboard/clientes/ClientesCliente.tsx` (línea ~200)
- Modify: `src/app/dashboard/campanias/CampaniasCliente.tsx` (línea ~456)
- Modify: `src/app/dashboard/config/ConfigCliente.tsx` (línea ~408)
- Modify: `src/app/admin/page.tsx` (línea ~126)

- [ ] **Ejecutar el reemplazo en todos los archivos a la vez**

```bash
find src/app/dashboard src/app/admin -name "*.tsx" | xargs grep -l 'p-6 w-\[85%\] mx-auto' | xargs sed -i '' 's/p-6 w-\[85%\] mx-auto/p-4 md:p-6 md:w-[85%] md:mx-auto/g'
```

- [ ] **Verificar el reemplazo**

```bash
grep -r 'w-\[85%\]' src/app/dashboard src/app/admin
```

Esperado: no debe aparecer ningún resultado (todos reemplazados).

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/clientes/ClientesCliente.tsx src/app/dashboard/campanias/CampaniasCliente.tsx src/app/dashboard/config/ConfigCliente.tsx src/app/admin/page.tsx
git commit -m "fix: content width is full on mobile, 85% centered on tablet+"
```

---

## Task 7: Corregir ClientesCliente — grid de stats, buscador y vista mobile

**Files:**
- Modify: `src/app/dashboard/clientes/ClientesCliente.tsx`

Tres cambios en este archivo:
1. Stats grid: `grid-cols-3` → `grid-cols-1 md:grid-cols-3`
2. Fila de búsqueda: `flex gap-3` → `flex flex-col md:flex-row gap-3`
3. Lista de clientes: agregar `TarjetaCliente` para mobile (`md:hidden`) y envolver lista original en `hidden md:block`

- [ ] **Cambio 1: Fix stats grid (línea ~213)**

Buscar:
```tsx
<div className="grid grid-cols-3 gap-3 mb-6">
```

Reemplazar con:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
```

- [ ] **Cambio 2: Fix fila de búsqueda (línea ~228)**

Buscar:
```tsx
<div className="flex gap-3 mb-4">
```

Reemplazar con:
```tsx
<div className="flex flex-col md:flex-row gap-3 mb-4">
```

- [ ] **Cambio 3: Agregar componente TarjetaCliente justo antes de la función FilaCliente (línea ~130)**

Agregar este componente antes de `function FilaCliente`:

```tsx
// ─── Tarjeta cliente (mobile) ─────────────────────────────────────────────────
function TarjetaCliente({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
  const nombre  = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()
  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 mb-2 transition-colors"
      style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,182,25,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = '#2A2A29')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>{nombre}</p>
            <p className="text-xs truncate" style={{ color: '#5C5C59' }}>
              {cliente.celular ?? cliente.email ?? 'Sin contacto'}
            </p>
          </div>
        </div>
        <PushBadge activo={cliente.push_activo} />
      </div>
      <div className="flex gap-4 pl-12">
        <span className="text-xs" style={{ color: '#5C5C59' }}>
          {cliente.total_citas} cita{cliente.total_citas !== 1 ? 's' : ''}
        </span>
        {cliente.ultima_cita_at && (
          <span className="text-xs" style={{ color: '#5C5C59' }}>
            Última: {format(new Date(cliente.ultima_cita_at), "d MMM yyyy", { locale: es })}
          </span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Cambio 4: Reemplazar el bloque de lista (líneas 266–282) con vistas mobile/desktop**

Buscar y reemplazar el bloque exacto:

```tsx
      {/* Lista */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>

        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm" style={{ color: '#5C5C59' }}>
              {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map(p => (
            <FilaCliente key={p.id} cliente={p} onClick={() => setClienteModal(p)} />
          ))
        )}
      </div>
```

Reemplazar con:

```tsx
      {/* Lista mobile: tarjetas */}
      <div className="md:hidden">
        {clientesFiltrados.length === 0 ? (
          <div className="rounded-xl p-12 text-center"
            style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <Users size={40} style={{ color: '#3D3D3B' }} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#5C5C59' }}>
              {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map(p => (
            <TarjetaCliente key={p.id} cliente={p} onClick={() => setClienteModal(p)} />
          ))
        )}
      </div>

      {/* Lista tablet+: filas */}
      <div className="hidden md:block rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm" style={{ color: '#5C5C59' }}>
              {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map(p => (
            <FilaCliente key={p.id} cliente={p} onClick={() => setClienteModal(p)} />
          ))
        )}
      </div>
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Verificar en el navegador**

Navegar a `/dashboard/clientes` en DevTools con viewport mobile (375px):
- Stats se muestran en columna única
- El buscador y filtro se apilan verticalmente
- Los clientes aparecen como tarjetas con nombre, teléfono, badge push y conteo de citas

- [ ] **Commit**

```bash
git add src/app/dashboard/clientes/ClientesCliente.tsx
git commit -m "feat: responsive client list — card view on mobile, grid fix, stacked search"
```

---

## Task 8: Agregar vista mobile de tarjetas en la página de Admin

**Files:**
- Modify: `src/app/admin/page.tsx`

La tabla de negocios recientes (líneas ~203–254) necesita una vista alternativa en mobile. En tablet+ se mantiene la tabla con `overflow-x-auto`.

- [ ] **Envolver la tabla existente y agregar vista mobile**

Localizar el bloque que comienza con:
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
```

Y termina con:
```tsx
        </table>
      </div>
```

Reemplazar todo ese bloque con:

```tsx
{/* Vista mobile: tarjetas */}
<div className="md:hidden space-y-3">
  {(negociosRecientes ?? []).map(negocio => (
    <div key={negocio.id} className="rounded-xl p-4"
      style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: '#F0F0EE' }}>{negocio.nombre}</p>
          <p className="text-xs mt-0.5" style={{ color: '#5C5C59' }}>{negocio.rubro}</p>
        </div>
        <span className="text-xs rounded-full px-2.5 py-1 font-medium flex-shrink-0"
          style={negocio.activo
            ? { background: 'rgba(122,182,25,0.12)', color: '#7AB619' }
            : { background: 'rgba(92,92,89,0.15)', color: '#5C5C59' }
          }>
          {negocio.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <SuscripcionBadge estado={suscripcionPorNegocio.get(negocio.id) ?? null} />
        <span className="text-xs" style={{ color: '#5C5C59' }}>
          {format(new Date(negocio.created_at), 'd MMM yyyy', { locale: es })}
        </span>
      </div>
    </div>
  ))}
  {(negociosRecientes ?? []).length === 0 && (
    <p className="text-sm text-center py-8" style={{ color: '#5C5C59' }}>
      No hay clientes registrados
    </p>
  )}
</div>

{/* Vista tablet+: tabla */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr style={{ borderBottom: '1px solid #3D3D3B' }}>
        {['Nombre', 'Rubro', 'Estado', 'Suscripción', 'Registrado'].map(h => (
          <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            style={{ color: '#5C5C59' }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {(negociosRecientes ?? []).map((negocio, i) => (
        <tr key={negocio.id}
          style={{
            borderBottom: i < (negociosRecientes?.length ?? 0) - 1 ? '1px solid #3D3D3B' : 'none',
          }}>
          <td className="px-6 py-4 font-medium" style={{ color: '#F0F0EE' }}>
            {negocio.nombre}
          </td>
          <td className="px-6 py-4" style={{ color: '#9A9A96' }}>
            {negocio.rubro}
          </td>
          <td className="px-6 py-4">
            <span className="text-xs rounded-full px-2.5 py-1 font-medium"
              style={negocio.activo
                ? { background: 'rgba(122,182,25,0.12)', color: '#7AB619' }
                : { background: 'rgba(92,92,89,0.15)', color: '#5C5C59' }
              }>
              {negocio.activo ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="px-6 py-4">
            <SuscripcionBadge estado={suscripcionPorNegocio.get(negocio.id) ?? null} />
          </td>
          <td className="px-6 py-4 text-xs" style={{ color: '#5C5C59' }}>
            {format(new Date(negocio.created_at), 'd MMM yyyy', { locale: es })}
          </td>
        </tr>
      ))}
      {(negociosRecientes ?? []).length === 0 && (
        <tr>
          <td colSpan={5} className="px-6 py-12 text-center text-sm"
            style={{ color: '#5C5C59' }}>
            No hay clientes registrados
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
```

- [ ] **Verificar que compila**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Verificar en el navegador**

Navegar a `/admin` en DevTools con viewport mobile:
- Se ven tarjetas con nombre, rubro, badge de estado, plan de suscripción y fecha
- En tablet+ se ve la tabla original

- [ ] **Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: admin negocios table shows card view on mobile"
```

---

## Verificación final

- [ ] **Build limpio**

```bash
npm run build 2>&1 | grep -E "(error|warning|✓)"
```

- [ ] **Lint**

```bash
npm run lint 2>&1 | tail -10
```

- [ ] **Prueba manual completa**

Arrancar `npm run dev` y verificar con DevTools en tres viewports:

| Viewport | Dashboard | Admin | Clientes |
|---|---|---|---|
| 375px (mobile) | Drawer abre/cierra, contenido full-width | Idem | Stats 1-col, tarjetas |
| 768px (tablet) | Sidebar icon-only auto | Idem | Stats 3-col, filas |
| 1280px (desktop) | Sidebar expandible | Idem | Stats 3-col, filas |

También verificar:
- Navegar entre páginas desde el drawer cierra el drawer automáticamente
- El overlay oscuro cierra el drawer al tocarlo
- La PWA (`/app/[slug]`) no está afectada
