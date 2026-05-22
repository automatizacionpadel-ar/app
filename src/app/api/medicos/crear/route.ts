// src/app/api/medicos/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const {
      nombre_completo, especialidad, telefono, email,
      direccion, descripcion, duracion_cita_min, dias_anticipacion,
      horarios, requiere_sena, monto_sena, alias_mp, cbu, titular_cuenta,
      prompt_personalidad, tono, idioma,
      mensaje_bienvenida, mensaje_confirmacion, mensaje_recordatorio, mensaje_cancelacion,
      faqs, email_acceso, password_acceso,
    } = body

    // Validaciones básicas
    if (!nombre_completo || !especialidad || !email_acceso || !password_acceso) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:    email_acceso,
      password: password_acceso,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Error al crear el usuario' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // 2. Registrar en tabla usuarios con rol 'medico'
    const { error: usuarioError } = await supabase
      .from('usuarios')
      .insert({ id: userId, rol: 'medico' })

    if (usuarioError) {
      // Rollback: eliminar usuario de Auth
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al registrar el usuario' }, { status: 500 })
    }

    // 3. Crear registro en tabla medicos
    const { data: medico, error: medicoError } = await supabase
      .from('medicos')
      .insert({
        usuario_id: userId,
        nombre_completo,
        especialidad,
        telefono:           telefono || null,
        email:              email || null,
        direccion:          direccion || null,
        descripcion:        descripcion || null,
        duracion_cita_min:  duracion_cita_min ?? 30,
        dias_anticipacion:  dias_anticipacion ?? 30,
        horarios:           horarios || null,
        requiere_sena:      requiere_sena ?? false,
        monto_sena:         requiere_sena && monto_sena ? parseFloat(monto_sena) : null,
        alias_mp:           alias_mp || null,
        cbu:                cbu || null,
        titular_cuenta:     titular_cuenta || null,
        activo:             true,
      })
      .select()
      .single()

    if (medicoError || !medico) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Error al crear el médico' }, { status: 500 })
    }

    // 4. Crear configuración del agente IA
    const { error: configError } = await supabase
      .from('medico_agente_config')
      .insert({
        medico_id:            medico.id,
        prompt_personalidad:  prompt_personalidad || 'Sos el asistente virtual del consultorio.',
        tono:                 tono || 'amigable',
        idioma:               idioma || 'es',
        mensaje_bienvenida:   mensaje_bienvenida || '¡Hola! ¿En qué puedo ayudarte?',
        mensaje_confirmacion: mensaje_confirmacion || 'Tu cita está confirmada para el {{fecha}} a las {{hora}}hs.',
        mensaje_recordatorio: mensaje_recordatorio || 'Te recordamos tu cita mañana {{fecha}} a las {{hora}}hs.',
        mensaje_cancelacion:  mensaje_cancelacion || 'Tu cita del {{fecha}} fue cancelada.',
      })

    if (configError) {
      console.error('Error creando config agente:', configError)
    }

    // 5. Crear FAQs (solo las que tienen pregunta y respuesta)
    const faqsValidas = (faqs ?? [])
      .filter((f: any) => f.pregunta?.trim() && f.respuesta?.trim())
      .map((f: any, i: number) => ({
        medico_id: medico.id,
        pregunta:  f.pregunta.trim(),
        respuesta: f.respuesta.trim(),
        orden:     i,
        activo:    true,
      }))

    if (faqsValidas.length > 0) {
      const { error: faqError } = await supabase.from('medico_faqs').insert(faqsValidas)
      if (faqError) console.error('Error creando FAQs:', faqError)
    }

    return NextResponse.json({
      ok: true,
      medico_id:     medico.id,
      webhook_token: medico.webhook_token,
    })
  } catch (error) {
    console.error('Error en /api/medicos/crear:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
