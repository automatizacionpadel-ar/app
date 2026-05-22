// src/app/api/medicos/publico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: medico } = await supabase
      .from('medicos')
      .select(`
        id,
        slug,
        nombre_completo,
        especialidad,
        direccion,
        telefono,
        activo,
        medico_agente_config (
          mensaje_bienvenida
        )
      `)
      .eq('slug', slug)
      .eq('activo', true)
      .single()

    if (!medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const config = (medico.medico_agente_config as any[])?.[0]

    return NextResponse.json({
      id:                 medico.id,
      slug:               medico.slug,
      nombre_completo:    medico.nombre_completo,
      especialidad:       medico.especialidad,
      direccion:          medico.direccion,
      telefono:           medico.telefono,
      mensaje_bienvenida: config?.mensaje_bienvenida ?? null,
    })
  } catch (error) {
    console.error('Error en /api/medicos/publico:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
