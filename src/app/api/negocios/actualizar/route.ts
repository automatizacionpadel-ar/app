// src/app/api/negocios/actualizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slugify'

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  nombre: string,
  excludeId: string
): Promise<string> {
  const base = slugify(nombre) || 'negocio'
  let candidate = base
  let i = 2
  while (true) {
    const { data } = await supabase
      .from('negocios')
      .select('id')
      .eq('slug', candidate)
      .neq('id', excludeId)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i++}`
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('rol').eq('id', user.id).single()

    const body = await req.json()

    // Superadmin puede actualizar cualquier negocio (para toggle de recetas, etc.)
    if (usuario?.rol === 'superadmin') {
      const { negocio_id, ...campos } = body
      if (!negocio_id) return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
      const admin = createAdminClient()
      const { error } = await admin.from('negocios').update(campos).eq('id', negocio_id)
      if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Negocio solo actualiza su propio registro
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios').select('id').eq('usuario_id', user.id).single()

    if (negocioError || !negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const {
      nombre, nombre_negocio, color_marca, telefono, direccion,
      foto_perfil_url, logo_url, sello_url, firma_url,
      horarios,
      precio_consulta, requiere_sena, monto_sena,
      cbu, alias_mp,
      acepta_agendamientos,
    } = body

    const admin = createAdminClient()
    const slugSource = nombre_negocio || nombre
    const nuevoSlug = slugSource ? await generateUniqueSlug(admin, slugSource, negocio.id) : undefined

    const { error: updateError } = await supabase
      .from('negocios')
      .update({
        nombre,
        nombre_negocio:      nombre_negocio  ?? null,
        color_marca:         color_marca     ?? null,
        ...(nuevoSlug ? { slug: nuevoSlug } : {}),
        telefono:            telefono        || null,
        direccion:           direccion       || null,
        foto_perfil_url:     foto_perfil_url ?? null,
        logo_url:            logo_url        ?? null,
        sello_url:           sello_url       ?? null,
        firma_url:           firma_url       ?? null,
        horarios:            horarios        ?? null,
        precio_consulta:     precio_consulta ?? null,
        requiere_sena:       requiere_sena   ?? false,
        monto_sena:          monto_sena      ?? null,
        cbu:                 cbu             ?? null,
        alias_mp:            alias_mp        ?? null,
        acepta_agendamientos: acepta_agendamientos ?? true,
      })
      .eq('id', negocio.id)

    if (updateError) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    return NextResponse.json({ ok: true, slug: nuevoSlug })
  } catch (error) {
    console.error('Error en /api/negocios/actualizar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
