// src/app/api/negocios/publico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })

    const tenant = await getTenantBySlug(slug)
    if (!tenant) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    return NextResponse.json({
      id: tenant.id,
      slug: tenant.slug,
      nombre: tenant.nombre,
      rubro: tenant.rubro,
      descripcion: tenant.descripcion,
      direccion: tenant.direccion,
      telefono: tenant.telefono,
      logo_url: tenant.logo_url ?? null,
      imagen_portada_url: tenant.imagen_portada_url ?? null,
      color_marca: tenant.color_marca ?? '#7AB619',
      color_secundario: tenant.color_secundario ?? null,
      texto_bienvenida: tenant.texto_bienvenida ?? null,
      mensaje_bienvenida: tenant.mensaje_bienvenida ?? null,
    })
  } catch (error) {
    console.error('Error en /api/negocios/publico:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
