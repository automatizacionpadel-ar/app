// src/app/api/negocios/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slugify'

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  nombre: string
): Promise<string> {
  const base = slugify(nombre) || 'negocio'
  let candidate = base
  let i = 2
  while (true) {
    const { data } = await supabase
      .from('negocios')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i++}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nombre, rubro, telefono, email,
      direccion, descripcion, duracion_cita_min, dias_anticipacion,
      horarios, requiere_sena, monto_sena, alias_mp, cbu, titular_cuenta,
      prompt_personalidad, tono, idioma,
      mensaje_bienvenida, mensaje_confirmacion, mensaje_recordatorio, mensaje_cancelacion,
      faqs, email_acceso, password_acceso,
    } = body

    if (!nombre || !rubro || !email_acceso || !password_acceso) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:         email_acceso,
      password:      password_acceso,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Error al crear el usuario' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    let slug: string
    try {
      slug = await generateUniqueSlug(supabase, nombre)
    } catch {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al generar el identificador' }, { status: 500 })
    }

    const { error: usuarioError } = await supabase
      .from('usuarios')
      .insert({ id: userId, rol: 'negocio' })

    if (usuarioError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al registrar el usuario' }, { status: 500 })
    }

    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .insert({
        usuario_id:        userId,
        slug,
        nombre,
        rubro,
        telefono:          telefono || null,
        email:             email || null,
        direccion:         direccion || null,
        descripcion:       descripcion || null,
        duracion_cita_min: duracion_cita_min ?? 30,
        dias_anticipacion: dias_anticipacion ?? 30,
        horarios:          horarios || null,
        requiere_sena:     requiere_sena ?? false,
        monto_sena:        requiere_sena && monto_sena ? parseFloat(monto_sena) : null,
        alias_mp:          alias_mp || null,
        cbu:               cbu || null,
        titular_cuenta:    titular_cuenta || null,
        activo:            true,
      })
      .select()
      .single()

    if (negocioError || !negocio) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al crear el negocio' }, { status: 500 })
    }

    const { error: configError } = await supabase
      .from('negocio_agente_config')
      .insert({
        negocio_id:           negocio.id,
        prompt_personalidad:  prompt_personalidad || 'Sos el asistente virtual del negocio.',
        tono:                 tono || 'amigable',
        idioma:               idioma || 'es',
        mensaje_bienvenida:   mensaje_bienvenida || '¡Hola! ¿En qué puedo ayudarte?',
        mensaje_confirmacion: mensaje_confirmacion || 'Tu cita está confirmada para el {{fecha}} a las {{hora}}hs.',
        mensaje_recordatorio: mensaje_recordatorio || 'Te recordamos tu cita mañana {{fecha}} a las {{hora}}hs.',
        mensaje_cancelacion:  mensaje_cancelacion || 'Tu cita del {{fecha}} fue cancelada.',
      })

    if (configError) console.error('Error creando config agente:', configError)

    if (typeof faqs === 'string' && faqs.trim()) {
      const { error: faqError } = await supabase.from('negocio_faqs').insert({
        negocio_id: negocio.id,
        pregunta:   'Preguntas frecuentes',
        respuesta:  faqs.trim(),
        orden:      0,
        activo:     true,
      })
      if (faqError) console.error('Error creando FAQs:', faqError)
    }

    return NextResponse.json({
      ok:            true,
      negocio_id:    negocio.id,
      slug:          negocio.slug,
      webhook_token: negocio.webhook_token,
    })
  } catch (error) {
    console.error('Error en /api/negocios/crear:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
