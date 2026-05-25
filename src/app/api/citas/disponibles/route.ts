// src/app/api/citas/disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addDays, parseISO, addMinutes, getDay } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Horarios } from '@/types'

export const dynamic = 'force-dynamic'

const TZ = 'America/Argentina/Buenos_Aires'

const DAY_NUM_TO_KEY: Record<number, keyof Horarios> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves', 5: 'viernes', 6: 'sabado',
}

const DIAS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export async function GET(req: NextRequest) {
  const negocioId = req.nextUrl.searchParams.get('negocio_id')
  if (!negocioId) {
    return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, horarios, duracion_cita_min')
    .eq('id', negocioId)
    .single()

  if (!negocio) {
    return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
  }

  const duracion: number = negocio.duracion_cita_min ?? 30
  const horarios = (negocio.horarios ?? {}) as Partial<Horarios>

  // Fetch existing citas for the next 14 days
  const hoy     = toZonedTime(new Date(), TZ)
  const desde   = formatInTimeZone(hoy, TZ, "yyyy-MM-dd'T'00:00:00xxx")
  const hasta14 = formatInTimeZone(addDays(hoy, 14), TZ, "yyyy-MM-dd'T'23:59:59xxx")

  const { data: citasExistentes } = await supabase
    .from('citas')
    .select('fecha_inicio, fecha_fin')
    .eq('negocio_id', negocioId)
    .neq('estado', 'cancelada')
    .gte('fecha_inicio', desde)
    .lte('fecha_inicio', hasta14)

  const ocupados: Array<{ inicio: Date; fin: Date }> = (citasExistentes ?? []).map(c => ({
    inicio: parseISO(c.fecha_inicio),
    fin:    parseISO(c.fecha_fin),
  }))

  const result: Array<{ fecha: string; label: string; slots: string[] }> = []

  for (let i = 0; i < 14; i++) {
    const dia      = addDays(hoy, i)
    const jsDay    = getDay(dia)
    const fechaStr = formatInTimeZone(dia, TZ, 'yyyy-MM-dd')

    const diaKey = DAY_NUM_TO_KEY[jsDay]
    if (!diaKey) continue

    const config = horarios[diaKey]
    if (!config?.activo) continue

    // Build slot boundaries correctly in the target timezone
    const slotBase = fromZonedTime(`${fechaStr}T${config.inicio}:00`, TZ)
    const endBase  = fromZonedTime(`${fechaStr}T${config.fin}:00`, TZ)

    const slots: string[] = []
    let cursor = new Date(slotBase)

    while (cursor < endBase) {
      const slotFin = addMinutes(cursor, duracion)
      if (slotFin > endBase) break

      // Skip past slots (only relevant for today, i === 0)
      if (cursor <= new Date()) {
        cursor = addMinutes(cursor, duracion)
        continue
      }

      // Check overlap with existing citas
      const ocupado = ocupados.some(c => cursor < c.fin && slotFin > c.inicio)

      if (!ocupado) {
        slots.push(formatInTimeZone(cursor, TZ, 'HH:mm'))
      }
      cursor = addMinutes(cursor, duracion)
    }

    if (slots.length > 0) {
      const dd    = formatInTimeZone(dia, TZ, 'd')
      const mm    = formatInTimeZone(dia, TZ, 'M')
      const label = `${DIAS_ES[jsDay].charAt(0).toUpperCase() + DIAS_ES[jsDay].slice(1)} ${dd}/${mm}`
      result.push({ fecha: fechaStr, label, slots })
    }
  }

  return NextResponse.json(result)
}
