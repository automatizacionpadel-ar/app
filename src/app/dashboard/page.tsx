// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

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

// ─── Próximas citas ───────────────────────────────────────────────────────────
function ProximasCitas({ citas }: { citas: any[] }) {
  const estadoColor: Record<string, string> = {
    pendiente:  '#F59E0B',
    confirmada: '#7AB619',
    cancelada:  '#EF4444',
    completada: '#5C5C59',
    no_asistio: '#8B5CF6',
  }

  if (citas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
        <p className="text-sm" style={{ color: '#5C5C59' }}>No hay citas para hoy</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {citas.map(cita => {
        const hora = format(new Date(cita.fecha_inicio), 'HH:mm')
        const paciente = cita.pacientes
        const nombre = paciente ? `${paciente.nombre} ${paciente.apellido ?? ''}`.trim() : 'Paciente'

        return (
          <div key={cita.id}
            className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors"
            style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
            <div className="text-sm font-mono font-semibold w-12 flex-shrink-0"
              style={{ color: '#7AB619' }}>{hora}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>{nombre}</p>
              <p className="text-xs truncate" style={{ color: '#5C5C59' }}>
                {cita.motivo_consulta ?? 'Sin motivo especificado'}
              </p>
            </div>
            <span className="text-xs rounded-full px-2.5 py-1 font-medium flex-shrink-0"
              style={{
                background: `${estadoColor[cita.estado]}18`,
                color: estadoColor[cita.estado]
              }}>
              {cita.estado}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  // Obtener medico_id
  let medicoId: string | null = null
  if (usuario.rol === 'medico') {
    const { data: medico } = await supabase.from('medicos').select('id').eq('usuario_id', user.id).single()
    if (medico) medicoId = medico.id
  }

  const ahora    = new Date()
  const hoyStart = startOfDay(ahora).toISOString()
  const hoyEnd   = endOfDay(ahora).toISOString()
  const mesStart = startOfMonth(ahora).toISOString()
  const mesEnd   = endOfMonth(ahora).toISOString()

  // Base query filter
  const filtro = medicoId ? { medico_id: medicoId } : {}

  // Stats en paralelo
  const [
    { count: citasHoy },
    { count: citasMes },
    { count: pacientesTotal },
    { count: citasPendientes },
    { data: proximasCitas },
  ] = await Promise.all([
    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('medico_id', medicoId ?? '')
      .gte('fecha_inicio', hoyStart).lte('fecha_inicio', hoyEnd),

    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('medico_id', medicoId ?? '')
      .gte('fecha_inicio', mesStart).lte('fecha_inicio', mesEnd),

    supabase.from('pacientes').select('*', { count: 'exact', head: true })
      .eq('medico_id', medicoId ?? ''),

    supabase.from('citas').select('*', { count: 'exact', head: true })
      .eq('medico_id', medicoId ?? '')
      .eq('estado', 'pendiente'),

    supabase.from('citas')
      .select('id, fecha_inicio, estado, motivo_consulta, pacientes(nombre, apellido)')
      .eq('medico_id', medicoId ?? '')
      .gte('fecha_inicio', hoyStart).lte('fecha_inicio', hoyEnd)
      .order('fecha_inicio', { ascending: true })
      .limit(10),
  ])

  const fechaHoy = format(ahora, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 capitalize" style={{ color: '#F0F0EE' }}>
          {fechaHoy}
        </h1>
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Resumen de actividad del consultorio
        </p>
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
          titulo="Pacientes"
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

      {/* Próximas citas del día */}
      <div className="rounded-xl p-6"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: '#F0F0EE' }}>
            Citas de hoy
          </h2>
          <a href="/dashboard/calendario"
            className="text-xs font-medium transition-colors hover:opacity-75"
            style={{ color: '#7AB619' }}>
            Ver calendario →
          </a>
        </div>
        <ProximasCitas citas={proximasCitas ?? []} />
      </div>
    </div>
  )
}
