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
