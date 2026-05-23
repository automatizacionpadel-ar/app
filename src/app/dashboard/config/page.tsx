// src/app/dashboard/config/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfigCliente from './ConfigCliente'

export default async function ConfigPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: medico } = await supabase
    .from('medicos')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) redirect('/dashboard')

  return <ConfigCliente medico={medico} />
}
