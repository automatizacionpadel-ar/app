// src/app/dashboard/clientes/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientesCliente from './ClientesCliente'

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let negocioId: string | null = null
  let negocioInfo: {
    id: string; nombre: string; rubro: string
    logo_url: string | null; sello_url: string | null
    firma_url: string | null; habilitar_recetas: boolean
  } | null = null

  if (usuario.rol === 'negocio') {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, nombre, rubro, logo_url, sello_url, firma_url, habilitar_recetas')
      .eq('usuario_id', user.id)
      .single()
    if (negocio) {
      negocioId = negocio.id
      negocioInfo = {
        id:               negocio.id,
        nombre:           negocio.nombre,
        rubro:            negocio.rubro,
        logo_url:         negocio.logo_url,
        sello_url:        negocio.sello_url,
        firma_url:        negocio.firma_url,
        habilitar_recetas: negocio.habilitar_recetas,
      }
    }
  }

  const query = supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (negocioId) query.eq('negocio_id', negocioId)

  const { data: clientes } = await query

  return (
    <ClientesCliente
      clientesIniciales={clientes ?? []}
      negocioId={negocioId}
      negocioInfo={negocioInfo}
    />
  )
}
