// src/app/api/negocios/publico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: negocio } = await supabase
      .from('negocios')
      .select(`
        id,
        slug,
        nombre,
        rubro,
        direccion,
        telefono,
        logo_url,
        color_marca,
        activo,
        negocio_agente_config (
          mensaje_bienvenida
        )
      `)
      .eq('slug', slug)
      .eq('activo', true)
      .single()

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const config = (negocio.negocio_agente_config as any[])?.[0]

    return NextResponse.json({
      id:                 negocio.id,
      slug:               negocio.slug,
      nombre:             negocio.nombre,
      rubro:              negocio.rubro,
      direccion:          negocio.direccion,
      telefono:           negocio.telefono,
      logo_url:           negocio.logo_url    ?? null,
      color_marca:        negocio.color_marca ?? '#7AB619',
      mensaje_bienvenida: config?.mensaje_bienvenida ?? null,
    })
  } catch (error) {
    console.error('Error en /api/negocios/publico:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
