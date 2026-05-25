// src/app/dashboard/clientes/page.tsx
import { getAuthSession } from '@/lib/auth'
import ClientesCliente from './ClientesCliente'

export default async function ClientesPage() {
  const { supabase, rol, negocio: negocioBasico } = await getAuthSession()

  if (rol !== 'negocio' || !negocioBasico) {
    return <ClientesCliente clientesIniciales={[]} negocioId={null} negocioInfo={null} />
  }

  const negocioId = negocioBasico.id

  const [{ data: negocio }, { data: clientes }] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, nombre, rubro, logo_url, sello_url, firma_url, habilitar_recetas')
      .eq('id', negocioId)
      .single(),
    supabase
      .from('clientes')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <ClientesCliente
      clientesIniciales={clientes ?? []}
      negocioId={negocioId}
      negocioInfo={negocio ?? null}
    />
  )
}
