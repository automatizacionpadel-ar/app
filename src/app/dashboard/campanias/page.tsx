// src/app/dashboard/campanias/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CampaniasCliente from './CampaniasCliente'

export default async function CampaniasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let medicoId: string | null = null
  if (usuario.rol === 'medico') {
    const { data: medico } = await supabase
      .from('medicos').select('id').eq('usuario_id', user.id).single()
    if (medico) medicoId = medico.id
  }

  // Historial de campañas
  const { data: campanias } = await supabase
    .from('mensajes_promo')
    .select('*')
    .eq('medico_id', medicoId ?? '')
    .order('created_at', { ascending: false })
    .limit(20)

  // Cantidad de pacientes con push activo
  const { count: totalConPush } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('medico_id', medicoId ?? '')
    .eq('activo', true)

  return (
    <CampaniasCliente
      campaniasIniciales={campanias ?? []}
      medicoId={medicoId}
      totalConPush={totalConPush ?? 0}
    />
  )
}
