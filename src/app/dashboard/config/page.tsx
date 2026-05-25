// src/app/dashboard/config/page.tsx
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ConfigCliente from './ConfigCliente'

export default async function ConfigPage() {
  const { negocio: negocioBasico } = await getAuthSession()
  if (!negocioBasico) redirect('/dashboard')

  // Necesitamos todos los campos del negocio para el formulario de config
  const supabase = createClient()
  const { data: negocio } = await supabase
    .from('negocios')
    .select('*')
    .eq('id', negocioBasico.id)
    .single()

  if (!negocio) redirect('/dashboard')

  return <ConfigCliente negocio={negocio} />
}
