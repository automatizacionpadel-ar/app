// src/app/dashboard/calendario/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarioCliente from './CalendarioCliente'

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let negocioId: string | null = null
  if (usuario.rol === 'medico') {
    const { data: medico } = await supabase.from('negocios').select('id').eq('usuario_id', user.id).single()
    if (medico) negocioId = medico.id
  }

  // Cargar citas iniciales del mes actual
  const ahora   = new Date()
  const start   = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const end     = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0).toISOString()

  const query = supabase
    .from('citas')
    .select('id, fecha_inicio, fecha_fin, estado, motivo_consulta, pacientes(nombre, apellido)')
    .gte('fecha_inicio', start)
    .lte('fecha_inicio', end)
    .order('fecha_inicio', { ascending: true })

  if (negocioId) query.eq('negocio_id', negocioId)

  const { data: citas } = await query

  return <CalendarioCliente citasIniciales={citas ?? []} negocioId={negocioId} />
}
