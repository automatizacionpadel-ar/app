// src/app/manifest/[slug]/route.ts — Manifest dinámico por tenant
import { NextRequest, NextResponse } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
  }

  const name = tenant.nombre
  const shortName = tenant.nombre.slice(0, 12)
  const themeColor = tenant.color_marca ?? '#20201F'
  const icon = tenant.logo_url ?? '/icon_big.png'

  const manifest = {
    name,
    short_name: shortName,
    description: tenant.descripcion ?? `Espacio de ${tenant.nombre}`,
    start_url: `/c/${tenant.slug}?utm_source=pwa`,
    scope: `/c/${tenant.slug}/`,
    display: 'standalone',
    background_color: '#20201F',
    theme_color: themeColor,
    orientation: 'portrait-primary' as const,
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['business'],
    lang: 'es',
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  })
}
