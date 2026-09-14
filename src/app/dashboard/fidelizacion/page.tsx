// src/app/dashboard/fidelizacion/page.tsx
import { getAuthSession } from '@/lib/auth'
import FidelizacionCliente from './FidelizacionCliente'

export const dynamic = 'force-dynamic'

export default async function FidelizacionPage() {
  const { supabase, rol, negocio } = await getAuthSession()
  const negocioId = rol === 'negocio' ? negocio?.id ?? null : null
  if (!negocioId) return <div className="p-6" style={{ color: '#9A9A96' }}>Sin negocio</div>
  const [{ data: config }, { data: cupones }, { data: clientes }] = await Promise.all([
    supabase.from('fidelizacion_config').select('*').eq('negocio_id', negocioId).maybeSingle(),
    supabase.from('cupones').select('*').eq('negocio_id', negocioId).order('created_at', { ascending: false }).limit(20),
    supabase.from('clientes').select('id, nombre, apellido').eq('negocio_id', negocioId).limit(30),
  ])
  // saldo por cliente (vista)
  const { data: saldos } = await supabase.from('fidelizacion_saldo').select('*').eq('negocio_id', negocioId).limit(20)
  return <FidelizacionCliente config={config} cuponesIniciales={cupones ?? []} clientes={clientes ?? []} saldos={saldos ?? []} negocioId={negocioId} />
}
