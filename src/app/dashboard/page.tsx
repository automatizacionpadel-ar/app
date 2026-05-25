// src/app/dashboard/page.tsx
import { getAuthSession } from '@/lib/auth'
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarioCliente from './calendario/CalendarioCliente'
import ChatButton from './ChatButton'

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ titulo, valor, subtitulo, icon, color }: {
  titulo: string; valor: string | number; subtitulo: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="rounded-xl p-5 animate-fade-up"
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const { supabase, rol, negocio } = await getAuthSession()

  const negocioId   = rol === 'negocio' ? (negocio?.id   ?? null) : null
  const medicoSlug  = rol === 'negocio' ? (negocio?.slug ?? null) : null

  const ahora    = new Date()
  const mesStart = startOfMonth(ahora).toISOString()
  const mesEnd   = endOfMonth(ahora).toISOString()
  const calStart = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const calEnd   = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0).toISOString()

  // Stats + citas para el calendario en paralelo
  const [
    { count: citasHoy },
    { count: citasMes },
    { count: pacientesTotal },
    { count: citasPendientes },
    { data: citasCalendario },
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
  ])

  const fechaHoy = format(ahora, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="p-6 w-[85%] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1 capitalize" style={{ color: '#F0F0EE' }}>
            {fechaHoy}
          </h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            Resumen de actividad del consultorio
          </p>
        </div>
        {medicoSlug && <ChatButton slug={medicoSlug} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          titulo="Citas hoy"
          valor={citasHoy ?? 0}
          subtitulo="Agendadas para hoy"
          icon={<Calendar size={20} />}
          color="#7AB619"
        />
        <StatCard
          titulo="Citas del mes"
          valor={citasMes ?? 0}
          subtitulo={format(ahora, 'MMMM yyyy', { locale: es })}
          icon={<CheckCircle size={20} />}
          color="#3B82F6"
        />
        <StatCard
          titulo="Clientes"
          valor={pacientesTotal ?? 0}
          subtitulo="Total registrados"
          icon={<Users size={20} />}
          color="#8B5CF6"
        />
        <StatCard
          titulo="Pendientes"
          valor={citasPendientes ?? 0}
          subtitulo="Sin confirmar"
          icon={<Clock size={20} />}
          color="#F59E0B"
        />
      </div>

      {/* Calendario */}
      <CalendarioCliente citasIniciales={citasCalendario ?? []} negocioId={negocioId} />
    </div>
  )
}
