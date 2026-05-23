// src/app/api/citas/comprobante/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const { cita_id, comprobante_url } = await req.json()

    if (!cita_id || !comprobante_url) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('citas')
      .update({ comprobante_url })
      .eq('id', cita_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
