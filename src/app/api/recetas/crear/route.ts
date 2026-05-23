// src/app/api/recetas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: medico } = await supabase
      .from('medicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (!medico) return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })

    const { paciente_id, medicamentos, pdf_url } = await req.json()

    if (!paciente_id || !medicamentos?.length || !pdf_url) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Guardar receta
    const { data: receta, error: recetaError } = await admin
      .from('recetas')
      .insert({ medico_id: medico.id, paciente_id, medicamentos, pdf_url })
      .select('id')
      .single()

    if (recetaError) {
      return NextResponse.json({ error: recetaError.message }, { status: 500 })
    }

    // Enviar push al paciente
    await fetch(`${req.nextUrl.origin}/api/push/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({
        paciente_id,
        medico_id: medico.id,
        titulo: 'Tu médico te envió una receta',
        cuerpo: 'Tocá para abrirla',
        tipo:   'receta',
        url:    pdf_url,
      }),
    })

    return NextResponse.json({ ok: true, receta_id: receta.id })
  } catch (err) {
    console.error('Error en POST /api/recetas/crear:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
