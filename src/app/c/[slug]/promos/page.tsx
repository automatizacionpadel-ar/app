import Link from 'next/link'
import { getTenantBySlug } from '@/lib/tenant'
import { ArrowLeft, Tag, Ticket, Gift } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PromosPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  const color = tenant.color_marca ?? '#7AB619'

  const admin = createAdminClient()
  const { data: cupones } = await admin.from('cupones').select('codigo, descuento_porcentaje, vence_at').eq('negocio_id', tenant.id).eq('activo', true).order('created_at', { ascending: false }).limit(10)

  if (!cupones || cupones.length === 0) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#20201F' }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
          <Link href={`/c/${params.slug}`} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}><ArrowLeft size={18} /></Link>
          <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Promociones</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, color }}><Tag size={24} /></div>
          <h2 className="text-base font-semibold" style={{ color: '#F0F0EE' }}>Sin promos por ahora</h2>
          <p className="text-sm max-w-xs" style={{ color: '#9A9A96' }}>Seguí atento, {tenant.nombre} publicará beneficios exclusivos aquí.</p>
          <Link href={`/c/${params.slug}/chat`} className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: color, color: '#fff' }}>Hablar con nosotros</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#20201F' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <Link href={`/c/${params.slug}`} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}><ArrowLeft size={18} /></Link>
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Promociones</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {cupones.map((c: any) => (
          <div key={c.codigo} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#2A2A29', border: `1px dashed ${color}60` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}><Ticket size={18} /></div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#F0F0EE' }}>{c.codigo}</p>
              <p className="text-xs" style={{ color }}>{c.descuento_porcentaje}% OFF</p>
              {c.vence_at && <p className="text-xs" style={{ color: '#5C5C59' }}>Vence {new Date(c.vence_at).toLocaleDateString()}</p>}
            </div>
            <Gift size={16} style={{ color }} />
          </div>
        ))}
      </div>
    </div>
  )
}
