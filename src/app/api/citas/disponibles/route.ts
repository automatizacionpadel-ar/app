// src/app/api/citas/disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { addDays, parseISO, addMinutes, getDay } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

const WEEKDAY_MAP: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 0,
}

const TZ = 'America/Argentina/Buenos_Aires'

export async function GET(req: NextRequest) {
  const medicoId = req.nextUrl.searchParams.get('medico_id')
  if (!medicoId) {
    return NextResponse.json({ error: 'medico_id requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: medico } = await supabase
    .from('medicos')
    .select('id, horarios, duracion_cita_min')
    .eq('id', medicoId)
    .single()

  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
  }

  const duracion: number = medico.duracion_cita_min ?? 30
  const horarios: Record<string, { activo: boolean; inicio: string; fin: string }> =
    medico.horarios ?? {}

  // Fetch existing citas for the next 14 days
  const hoy     = toZonedTime(new Date(), TZ)
  const desde   = formatInTimeZone(hoy, TZ, "yyyy-MM-dd'T'00:00:00xxx")
  const hasta14 = formatInTimeZone(addDays(hoy, 14), TZ, "yyyy-MM-dd'T'23:59:59xxx")

  const { data: citasExistentes } = await supabase
    .from('citas')
    .select('fecha_inicio, fecha_fin')
    .eq('medico_id', medicoId)
    .neq('estado', 'cancelada')
    .gte('fecha_inicio', desde)
    .lte('fecha_inicio', hasta14)

  const ocupados: Array<{ inicio: Date; fin: Date }> = (citasExistentes ?? []).map(c => ({
    inicio: parseISO(c.fecha_inicio),
    fin:    parseISO(c.fecha_fin),
  }))

  const result: Array<{ fecha: string; label: string; slots: string[] }> = []

  const DIAS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  for (let i = 0; i < 14; i++) {
    const dia      = addDays(hoy, i)
    const jsDay    = getDay(dia)
    const fechaStr = formatInTimeZone(dia, TZ, 'yyyy-MM-dd')

    // Find which horario key matches this weekday
    const diaKey = Object.keys(WEEKDAY_MAP).find(k => WEEKDAY_MAP[k] === jsDay)
    if (!diaKey) continue

    const config = horarios[diaKey]
    if (!config?.activo) continue

    // Generate all slots for this day
    const [hIni, mIni] = config.inicio.split(':').map(Number)
    const [hFin, mFin] = config.fin.split(':').map(Number)

    const slotBase = toZonedTime(parseISO(`${fechaStr}T00:00:00`), TZ)
    slotBase.setHours(hIni, mIni, 0, 0)

    const endBase = toZonedTime(parseISO(`${fechaStr}T00:00:00`), TZ)
    endBase.setHours(hFin, mFin, 0, 0)

    const slots: string[] = []
    let cursor = new Date(slotBase)

    while (cursor < endBase) {
      const slotFin = addMinutes(cursor, duracion)
      if (slotFin > endBase) break

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
