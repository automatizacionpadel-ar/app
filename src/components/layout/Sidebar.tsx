// src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import {
  LayoutDashboard, Calendar, Users, Megaphone,
  Settings, LogOut, ChevronLeft, ChevronRight,
  UserCog, Stethoscope,
} from 'lucide-react'

interface NavItem {
  label: string
  href:  string
  icon:  React.ReactNode
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',          icon: <LayoutDashboard size={18} /> },
  { label: 'Calendario', href: '/dashboard/calendario', icon: <Calendar size={18} /> },
  { label: 'Pacientes',  href: '/dashboard/pacientes',  icon: <Users size={18} /> },
  { label: 'Campañas',   href: '/dashboard/campanias',  icon: <Megaphone size={18} /> },
  { label: 'Médicos',    href: '/admin/medicos',         icon: <Stethoscope size={18} />, adminOnly: true },
  { label: 'Configuración', href: '/dashboard/config',  icon: <Settings size={18} /> },
]

interface SidebarProps {
  rol: 'superadmin' | 'medico'
  nombreMedico?: string
}

export default function Sidebar({ rol, nombreMedico }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const items = NAV_ITEMS.filter(item => !item.adminOnly || rol === 'superadmin')

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
      style={{ background: '#2A2A29', borderRight: '1px solid #3D3D3B' }}>

      {/* Logo */}
      <div className={clsx(
        'flex items-center h-16 px-4 flex-shrink-0',
        collapsed ? 'justify-center' : 'justify-between'
      )}
        style={{ borderBottom: '1px solid #3D3D3B' }}>
        {!collapsed && (
          <Image src="/logo.png" alt="SimplificIA" width={130} height={34} priority />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#7AB619')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Médico info */}
      {!collapsed && nombreMedico && (
        <div className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <p className="text-xs" style={{ color: '#5C5C59' }}>
            {rol === 'superadmin' ? 'Administrador' : 'Dr./Dra.'}
          </p>
          <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>
            {nombreMedico}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                collapsed && 'justify-center px-2',
              )}
              style={{
                color:      active ? '#7AB619' : '#9A9A96',
                background: active ? 'rgba(122,182,25,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(122,182,25,0.05)'; e.currentTarget.style.color = '#F0F0EE' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9A96' } }}
              title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.adminOnly && (
                <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 font-semibold"
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
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
            collapsed && 'justify-center px-2'
          )}
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5C59'; e.currentTarget.style.background = 'transparent' }}
          title={collapsed ? 'Cerrar sesión' : undefined}>
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
