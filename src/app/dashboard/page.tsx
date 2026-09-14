// src/app/dashboard/page.tsx
import { getAuthSession } from '@/lib/auth'
import { Calendar, Users, CheckCircle, Clock, ShoppingBag, Tag, Star, MessageSquare, QrCode } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarioCliente from './calendario/CalendarioCliente'
import ChatButton from './ChatButton'
import Link from 'next/link'

function StatCard({ titulo, valor, subtitulo, icon, color, href }: {
  titulo: string; valor: string | number; subtitulo: string
  icon: React.ReactNode; color: string; href?: string
}) {
  const Card = (
    <div className="rounded-xl p-5 hover:brightness-110 transition-all"
      style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="rounded-lg p-2.5" style={{ background: `${color}18` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: '#F0F0EE' }}>{valor}</p>
      <p className="text-sm font-medium mb-1" style={{ color: '#F0F0EE' }}>{titulo}</p>
      <p className="text-xs" style={{ color: '#5C5C59' }}>{subtitulo}</p>
    </div>
  )
  return href ? <Link href={href}>{Card}</Link> : Card
}

export default async function DashboardPage() {
  const { supabase, rol, negocio } = await getAuthSession()

  const negocioId   = rol === 'negocio' ? (negocio?.id   ?? null) : null
  const medicoSlug  = rol === 'negocio' ? (negocio?.slug ?? null) : null

  const ahora    = new Date()
  const mesStart = startOfMonth(ahora).toISOString()
  const mesEnd   = endOfMonth(ahora).toISOString()
  const calStart = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const calEnd   = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0).toISOString()

  const [
    { count: citasHoy },
    { count: citasMes },
    { count: pacientesTotal },
    { count: citasPendientes },
    { data: citasCalendario },
    { count: serviciosActivos },
    { count: pedidosPendientes },
    { count: conversacionesAbiertas },
    { count: qrCampanias },
    { count: etiquetasTotal },
  ] = await Promise.all([
    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId ?? '')
      .gte('fecha_inicio', new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString())
      .lt('fecha_inicio', new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1).toISOString()),

    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId ?? '')
      .gte('fecha_inicio', mesStart).lte('fecha_inicio', mesEnd),

    supabase.from('clientes').select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId ?? ''),

    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId ?? '')
      .eq('estado', 'pendiente'),

    supabase.from('citas')
      .select('id, fecha_inicio, fecha_fin, estado, motivo, clientes(nombre, apellido)')
      .eq('negocio_id', negocioId ?? '')
      .gte('fecha_inicio', calStart)
      .lte('fecha_inicio', calEnd)
      .order('fecha_inicio', { ascending: true }),

    // Nuevos módulos
    supabase.from('servicios').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId ?? '').eq('activo', true),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId ?? '').eq('estado', 'pendiente'),
    supabase.from('conversaciones').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId ?? '').eq('estado', 'abierta'),
    supabase.from('qr_campanias').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId ?? ''),
    supabase.from('etiquetas').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId ?? ''),
  ])

  const fechaHoy = format(ahora, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="p-4 md:p-6 md:w-[85%] md:mx-auto">

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1 capitalize" style={{ color: '#F0F0EE' }}>{fechaHoy}</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>Resumen de tu negocio · PWA multi-módulo</p>
        </div>
        {medicoSlug && <ChatButton slug={medicoSlug} />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard titulo="Citas hoy" valor={citasHoy ?? 0} subtitulo="Agendadas hoy" icon={<Calendar size={20} />} color="#7AB619" href="/dashboard/calendario" />
        <StatCard titulo="Citas del mes" valor={citasMes ?? 0} subtitulo={format(ahora, 'MMMM yyyy', { locale: es })} icon={<CheckCircle size={20} />} color="#3B82F6" />
        <StatCard titulo="Clientes" valor={pacientesTotal ?? 0} subtitulo="Total registrados" icon={<Users size={20} />} color="#8B5CF6" href="/dashboard/clientes" />
        <StatCard titulo="Pendientes" valor={citasPendientes ?? 0} subtitulo="Citas sin confirmar" icon={<Clock size={20} />} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard titulo="Conversaciones" valor={conversacionesAbiertas ?? 0} subtitulo="Abiertas" icon={<MessageSquare size={20} />} color="#7AB619" href="/dashboard/mensajeria" />
        <StatCard titulo="Pedidos" valor={pedidosPendientes ?? 0} subtitulo="Pendientes" icon={<ShoppingBag size={20} />} color="#F97316" href="/dashboard/pedidos" />
        <StatCard titulo="Servicios" valor={serviciosActivos ?? 0} subtitulo="Activos" icon={<Tag size={20} />} color="#06B6D4" href="/dashboard/servicios" />
        <StatCard titulo="Etiquetas" valor={etiquetasTotal ?? 0} subtitulo="Segmentos" icon={<Star size={20} />} color="#EC4899" href="/dashboard/etiquetas" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/dashboard/qr" className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}><QrCode size={18}/></div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>QR / NFC</p>
            <p className="text-xs" style={{ color: '#5C5C59' }}>{qrCampanias ?? 0} campañas</p>
          </div>
        </Link>
        <Link href="/dashboard/campanias" className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}><ShoppingBag size={18}/></div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Campañas</p>
            <p className="text-xs" style={{ color: '#5C5C59' }}>Push segmentado</p>
          </div>
        </Link>
      </div>

      <CalendarioCliente citasIniciales={citasCalendario ?? []} negocioId={negocioId} />
    </div>
  )
}
