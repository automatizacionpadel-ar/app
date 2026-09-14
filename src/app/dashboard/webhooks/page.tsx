// src/app/dashboard/webhooks/page.tsx
import { getAuthSession } from '@/lib/auth'
import WebhooksCliente from './WebhooksCliente'

export const dynamic = 'force-dynamic'

export default async function WebhooksPage() {
  const { supabase, rol, negocio } = await getAuthSession()
  const negocioId = rol === 'negocio' ? negocio?.id ?? null : null
  if (!negocioId) return <div className="p-6" style={{ color: '#9A9A96' }}>Sin negocio</div>

  const { data: hooks } = await supabase.from('negocio_webhooks').select('*').eq('negocio_id', negocioId).order('created_at', { ascending: false })
  return <WebhooksCliente hooksIniciales={hooks ?? []} />
}
