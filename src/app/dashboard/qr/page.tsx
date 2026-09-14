// src/app/dashboard/qr/page.tsx — Generador QR por tenant + campañas
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QrCliente from './QrCliente'

export const dynamic = 'force-dynamic'

export default async function QrPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolver negocio
  let negocio: any = null
  const { data: miembro } = await supabase.from('negocio_miembros').select('negocio_id').eq('usuario_id', user.id).maybeSingle()
  if ((miembro as any)?.negocio_id) {
    const { data } = await supabase.from('negocios').select('id, slug, nombre, logo_url, color_marca').eq('id', (miembro as any).negocio_id).single()
    negocio = data
  } else {
    const { data } = await supabase.from('negocios').select('id, slug, nombre, logo_url, color_marca').eq('usuario_id', user.id).single()
    negocio = data
  }
  if (!negocio) redirect('/dashboard')

  // QR campañas
  let campanias: any[] = []
  try {
    const { data } = await supabase.from('qr_campanias').select('*').eq('negocio_id', negocio.id).order('created_at', { ascending: false })
    campanias = data ?? []
  } catch {}

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simplificia.com.ar'
  // Fallback: usar origin del request no disponible en RSC, usar baseUrl
  const qrUrl = `${baseUrl}/c/${negocio.slug}`

  return <QrCliente negocio={negocio} qrUrl={qrUrl} campanias={campanias} baseUrl={baseUrl} />
}
