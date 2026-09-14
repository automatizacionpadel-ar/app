import Link from 'next/link'
import { getTenantBySlug } from '@/lib/tenant'
import { ArrowLeft, Store } from 'lucide-react'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  const color = tenant.color_marca ?? '#7AB619'

  return (
    <div className="flex flex-col h-full" style={{ background: '#20201F' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
        <Link href={`/c/${params.slug}`} className="rounded-lg p-1.5" style={{ color: '#5C5C59' }}>
          <ArrowLeft size={18} />
        </Link>
        <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Servicios</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
          <Store size={24} />
        </div>
        <h2 className="text-base font-semibold" style={{ color: '#F0F0EE' }}>Próximamente</h2>
        <p className="text-sm max-w-xs" style={{ color: '#9A9A96' }}>
          Estamos preparando el catálogo de servicios de {tenant.nombre}. Mientras tanto, ¡hablá con nosotros por chat!
        </p>
        <Link href={`/c/${params.slug}/chat`} className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: color, color: '#fff' }}>
          Ir al chat
        </Link>
      </div>
    </div>
  )
}
