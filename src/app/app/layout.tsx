// src/app/app/layout.tsx
// Layout de la PWA orientada al paciente
// Separado del dashboard del médico — sin sidebar, sin auth de dashboard

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'SimplificIA — Tu consultorio',
  description: 'Agendá tu cita y recibí recordatorios',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor:        '#20201F',
  width:             'device-width',
  initialScale:      1,
  maximumScale:      1,
  userScalable:      false,
  viewportFit:       'cover',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col max-w-md mx-auto"
      style={{ background: '#20201F', height: '100dvh', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
