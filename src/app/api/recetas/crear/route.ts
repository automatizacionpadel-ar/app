// src/app/api/recetas/crear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: negocio } = await supabase
      .from('negocios')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    const { cliente_id, medicamentos, pdf_url } = await req.json()

    if (!cliente_id || !medicamentos?.length || !pdf_url) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Guardar receta
    const { data: receta, error: recetaError } = await admin
      .from('recetas')
      .insert({ negocio_id: negocio.id, cliente_id, medicamentos, pdf_url })
      .select('id')
      .single()

    if (recetaError) {
      return NextResponse.json({ error: recetaError.message }, { status: 500 })
    }

    // Enviar push al cliente
    await fetch(`${req.nextUrl.origin}/api/push/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({
        cliente_id,
        negocio_id: negocio.id,
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
