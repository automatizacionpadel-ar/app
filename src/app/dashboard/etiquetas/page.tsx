// src/app/dashboard/etiquetas/page.tsx
import { getAuthSession } from '@/lib/auth'
import EtiquetasCliente from './EtiquetasCliente'

export const dynamic = 'force-dynamic'

export default async function EtiquetasPage() {
  const { supabase, rol, negocio } = await getAuthSession()
  const negocioId = rol === 'negocio' ? negocio?.id ?? null : null
  if (!negocioId) return <div className="p-6" style={{ color: '#9A9A96' }}>Sin negocio</div>

  const { data: etiquetas } = await supabase
    .from('etiquetas')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('nombre')

  const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId)

  return <EtiquetasCliente etiquetasIniciales={etiquetas ?? []} totalClientes={totalClientes ?? 0} />
}
