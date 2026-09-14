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
  Briefcase, X, QrCode,
} from 'lucide-react'

interface NavItem {
  label:        string
  href:         string
  icon:         React.ReactNode
  adminOnly?:   boolean
  clienteOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',            icon: <LayoutDashboard size={18} /> },
  { label: 'Mensajería',   href: '/dashboard/mensajeria', icon: <MessageSquare size={18} />, clienteOnly: true },
  { label: 'Clientes',     href: '/dashboard/clientes',   icon: <Users size={18} />,         clienteOnly: true },
  { label: 'QR / NFC',     href: '/dashboard/qr',         icon: <QrCode size={18} />,        clienteOnly: true },
  { label: 'Campañas',     href: '/dashboard/campanias',  icon: <Megaphone size={18} />,     clienteOnly: true },
  { label: 'Negocios',     href: '/admin/negocios',       icon: <Briefcase size={18} />,     adminOnly: true },
  { label: 'Configuración', href: '/dashboard/config',    icon: <Settings size={18} />,      clienteOnly: true },
]

interface SidebarProps {
  rol:            string
  nombreNegocio?: string
  isDrawerOpen?:  boolean
  onClose?:       () => void
}

export default function Sidebar({ rol, nombreNegocio, isDrawerOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
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
        'flex flex-col h-screen z-50 flex-shrink-0',
        // Mobile: fixed drawer, slide in/out
        'fixed inset-y-0 left-0 w-[220px]',
        'transition-transform duration-300',
        isDrawerOpen ? 'translate-x-0' : '-translate-x-full',
        // Tablet+: sticky in-flow, always 64px, always visible
        'md:sticky md:top-0 md:translate-x-0 md:w-[64px]',
        // Desktop: respect collapsed state
        collapsed ? 'lg:w-[64px]' : 'lg:w-[220px]',
      )}
      style={{ background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>

      {/* Logo row */}
      <div
        className={clsx(
          'flex items-center h-16 px-4 flex-shrink-0',
          'justify-between',
          'md:justify-center',
          !collapsed ? 'lg:justify-between' : 'lg:justify-center',
        )}
        style={{ borderBottom: '1px solid #3D3D3B' }}>

        {/* Logo: mobile always, desktop when expanded */}
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
            'px-4 py-3 flex-shrink-0',
            'block md:hidden',
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
              {/* Text: mobile always, tablet hidden, desktop respects collapsed */}
              <span className={clsx(
                'inline md:hidden',
                !collapsed ? 'lg:inline' : 'lg:hidden',
              )}>
                {item.label}
              </span>
              {/* Admin badge */}
              {item.adminOnly && (
                <span
                  className={clsx(
                    'ml-auto text-[10px] rounded px-1.5 py-0.5 font-semibold',
                    'inline md:hidden',
                    !collapsed ? 'lg:inline' : 'lg:hidden',
                  )}
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
