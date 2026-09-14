// src/app/c/[slug]/layout.tsx — Layout PWA tenant (landing + chat)
import type { Metadata, Viewport } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: `SimplificIA — ${params.slug}`,
    description: 'Tu espacio directo con la empresa. Chat, notificaciones y más.',
    manifest: `/manifest/${params.slug}`,
  }
}

export const viewport: Viewport = {
  themeColor: '#20201F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col max-w-md mx-auto"
      style={{ background: '#20201F', height: '100dvh', overflow: 'hidden' }}
    >
      {children}
    </div>
  )
}
