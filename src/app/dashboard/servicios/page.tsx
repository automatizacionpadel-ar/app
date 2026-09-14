// src/app/dashboard/servicios/page.tsx
import { getAuthSession } from '@/lib/auth'
import ServiciosCliente from './ServiciosCliente'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage() {
  const { supabase, rol, negocio } = await getAuthSession()
  const negocioId = rol === 'negocio' ? negocio?.id ?? null : null
  if (!negocioId) return <div className="p-6" style={{ color: '#9A9A96' }}>Sin negocio</div>

  const { data: servicios } = await supabase.from('servicios').select('*').eq('negocio_id', negocioId).order('orden').order('created_at', { ascending: false })
  return <ServiciosCliente serviciosIniciales={servicios ?? []} negocioId={negocioId} />
}
