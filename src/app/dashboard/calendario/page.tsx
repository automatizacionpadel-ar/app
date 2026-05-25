// src/app/dashboard/calendario/page.tsx
import { getAuthSession } from '@/lib/auth'
import CalendarioCliente from './CalendarioCliente'

export default async function CalendarioPage() {
  const { supabase, rol, negocio } = await getAuthSession()

  const negocioId = rol === 'negocio' ? (negocio?.id ?? null) : null

  const ahora = new Date()
  const start = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const end   = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0).toISOString()

  const query = supabase
    .from('citas')
    .select('id, fecha_inicio, fecha_fin, estado, motivo, clientes(nombre, apellido)')
    .gte('fecha_inicio', start)
    .lte('fecha_inicio', end)
    .order('fecha_inicio', { ascending: true })

  if (negocioId) query.eq('negocio_id', negocioId)

  const { data: citas } = await query

  return <CalendarioCliente citasIniciales={citas ?? []} negocioId={negocioId} />
}
