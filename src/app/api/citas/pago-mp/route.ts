// src/app/api/citas/pago-mp/route.ts
// Crea una preferencia de Mercado Pago Checkout Pro o devuelve el alias como fallback
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { cita_id, medico_id } = await req.json()

    if (!cita_id || !medico_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: medico } = await supabase
      .from('medicos')
      .select('nombre_completo, precio_consulta, monto_sena, requiere_sena, mp_access_token, alias_mp')
      .eq('id', medico_id)
      .single()

    if (!medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const monto = (medico.requiere_sena && medico.monto_sena)
      ? medico.monto_sena
      : (medico.precio_consulta ?? 0)

    // Si tiene access token → Checkout Pro
    if (medico.mp_access_token && monto > 0) {
      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${medico.mp_access_token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          items: [{
            title:      `Consulta - ${medico.nombre_completo}`,
            quantity:   1,
            unit_price: monto,
            currency_id: 'ARS',
          }],
          external_reference: cita_id,
          auto_return:        'approved',
        }),
      })

      if (mpRes.ok) {
        const mpData = await mpRes.json()

        await supabase
          .from('citas')
          .update({ mp_preference_id: mpData.id })
          .eq('id', cita_id)

        return NextResponse.json({
          tipo:  'checkout',
          link:  mpData.init_point as string,
          monto,
        })
      }
    }

    // Fallback: alias de Mercado Pago
    return NextResponse.json({
      tipo:  'alias',
      alias: medico.alias_mp ?? null,
      monto,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
