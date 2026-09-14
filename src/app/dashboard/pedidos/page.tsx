// src/app/dashboard/pedidos/page.tsx
import { getAuthSession } from '@/lib/auth'
import PedidosCliente from './PedidosCliente'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const { supabase, rol, negocio } = await getAuthSession()
  const negocioId = rol === 'negocio' ? negocio?.id ?? null : null
  if (!negocioId) return <div className="p-6" style={{ color: '#9A9A96' }}>Sin negocio</div>
  const [{ data: pedidos }, { data: servicios }, { data: clientes }] = await Promise.all([
    supabase.from('pedidos').select('*, clientes(nombre, apellido, celular), pedido_items(*)').eq('negocio_id', negocioId).order('created_at', { ascending: false }).limit(30),
    supabase.from('servicios').select('id, nombre, precio').eq('negocio_id', negocioId).eq('activo', true).order('nombre'),
    supabase.from('clientes').select('id, nombre, apellido, celular').eq('negocio_id', negocioId).order('nombre').limit(50),
  ])
  return <PedidosCliente pedidosIniciales={pedidos ?? []} servicios={servicios ?? []} clientes={clientes ?? []} />
}
