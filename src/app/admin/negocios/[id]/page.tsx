// src/app/admin/negocios/[id]/page.tsx
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import ConfigCliente from '@/app/dashboard/config/ConfigCliente'
import type { Negocio } from '@/types'

export default async function AdminNegocioConfigPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createAdminClient()

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!negocio) redirect('/admin/negocios')

  return <ConfigCliente negocio={negocio as Negocio} negocioId={negocio.id} />
}
