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
      descripcion, imagen_portada_url, color_secundario, texto_bienvenida, ocultar_marca_plataforma,
      modulos_habilitados, moneda,
    } = body

    const admin = createAdminClient()
    const slugSource = nombre_negocio || nombre
    const nuevoSlug = slugSource ? await generateUniqueSlug(admin, slugSource, negocio.id) : undefined

    const payload: any = {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(nombre_negocio !== undefined ? { nombre_negocio: nombre_negocio ?? null } : {}),
        ...(color_marca !== undefined ? { color_marca: color_marca ?? null } : {}),
        ...(nuevoSlug ? { slug: nuevoSlug } : {}),
        ...(telefono !== undefined ? { telefono: telefono || null } : {}),
        ...(direccion !== undefined ? { direccion: direccion || null } : {}),
        ...(foto_perfil_url !== undefined ? { foto_perfil_url: foto_perfil_url ?? null } : {}),
        ...(logo_url !== undefined ? { logo_url: logo_url ?? null } : {}),
        ...(sello_url !== undefined ? { sello_url: sello_url ?? null } : {}),
        ...(firma_url !== undefined ? { firma_url: firma_url ?? null } : {}),
        ...(horarios !== undefined ? { horarios: horarios ?? null } : {}),
        ...(precio_consulta !== undefined ? { precio_consulta: precio_consulta ?? null } : {}),
        ...(requiere_sena !== undefined ? { requiere_sena: requiere_sena ?? false } : {}),
        ...(monto_sena !== undefined ? { monto_sena: monto_sena ?? null } : {}),
        ...(cbu !== undefined ? { cbu: cbu ?? null } : {}),
        ...(alias_mp !== undefined ? { alias_mp: alias_mp ?? null } : {}),
        ...(acepta_agendamientos !== undefined ? { acepta_agendamientos: acepta_agendamientos ?? true } : {}),
        ...(descripcion !== undefined ? { descripcion: descripcion ?? null } : {}),
        ...(imagen_portada_url !== undefined ? { imagen_portada_url: imagen_portada_url ?? null } : {}),
        ...(color_secundario !== undefined ? { color_secundario: color_secundario ?? null } : {}),
        ...(texto_bienvenida !== undefined ? { texto_bienvenida: texto_bienvenida ?? null } : {}),
        ...(ocultar_marca_plataforma !== undefined ? { ocultar_marca_plataforma } : {}),
        ...(modulos_habilitados !== undefined ? { modulos_habilitados } : {}),
        ...(moneda !== undefined ? { moneda: moneda ?? 'ARS' } : {}),
      }

    const { error: updateError } = await supabase
      .from('negocios')
      .update(payload)
      .eq('id', negocio.id)

    if (updateError) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    return NextResponse.json({ ok: true, slug: nuevoSlug })
  } catch (error) {
    console.error('Error en /api/negocios/actualizar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
