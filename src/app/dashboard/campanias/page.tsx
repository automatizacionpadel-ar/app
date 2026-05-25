// src/app/dashboard/campanias/page.tsx
import { getAuthSession } from '@/lib/auth'
import CampaniasCliente from './CampaniasCliente'

export default async function CampaniasPage() {
  const { supabase, rol, negocio } = await getAuthSession()

  const negocioId = rol === 'negocio' ? (negocio?.id ?? null) : null

  const [{ data: campanias }, { count: totalConPush }] = await Promise.all([
    supabase
      .from('mensajes_promo')
      .select('*')
      .eq('negocio_id', negocioId ?? '')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId ?? '')
      .eq('activo', true),
  ])

  return (
    <CampaniasCliente
      campaniasIniciales={campanias ?? []}
      negocioId={negocioId}
      totalConPush={totalConPush ?? 0}
    />
  )
}
