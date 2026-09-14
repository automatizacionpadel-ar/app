// src/app/c/[slug]/page.tsx — Landing PWA por tenant
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/server'
import TenantLanding from '@/components/pwa/TenantLanding'

export const dynamic = 'force-dynamic'

export default async function TenantLandingPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { camp?: string; c?: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const camp = searchParams.camp ?? searchParams.c ?? null

  // Tracking de campaña (fire-and-forget, no bloquea render)
  if (camp) {
    const supabase = createAdminClient()
    // increment scans si existe campaña con ese código; si no, no falla
    supabase
      .from('qr_campanias')
      .update({ scans: supabase.rpc as any }) // placeholder — usamos raw increment abajo
      .eq('negocio_id', tenant.id)
      .eq('codigo', camp)
      .then(() => {})

    // Incremento real via SQL (no bloquear)
    // Usamos fetch interno para no importar rpc: simple update scans+1 si existe
    ;(async () => {
      try {
        const s = createAdminClient()
        const { data: row } = await s.from('qr_campanias').select('scans').eq('negocio_id', tenant.id).eq('codigo', camp).maybeSingle()
        if (row) await s.from('qr_campanias').update({ scans: (row as any).scans + 1 }).eq('negocio_id', tenant.id).eq('codigo', camp)
      } catch {}
    })()
  }

  return <TenantLanding tenant={tenant as any} camp={camp} />
}
