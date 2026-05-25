// src/app/api/citas/pago-mp/route.ts
// Crea una preferencia de Mercado Pago Checkout Pro o devuelve el alias como fallback
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { cita_id, negocio_id } = await req.json()

    if (!cita_id || !negocio_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: negocio } = await supabase
      .from('negocios')
      .select('nombre, precio_consulta, monto_sena, requiere_sena, mp_access_token, alias_mp')
      .eq('id', negocio_id)
      .single()

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const monto = (negocio.requiere_sena && negocio.monto_sena)
      ? negocio.monto_sena
      : (negocio.precio_consulta ?? 0)

    // Si tiene access token → Checkout Pro
    if (negocio.mp_access_token && monto > 0) {
      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${negocio.mp_access_token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          items: [{
            title:      `Consulta - ${negocio.nombre}`,
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
      alias: negocio.alias_mp ?? null,
      monto,
    })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
