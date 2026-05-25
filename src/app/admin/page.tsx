// src/app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, UserCheck, UserPlus, DollarSign, CreditCard, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
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

// ─── Badge suscripción ────────────────────────────────────────────────────────
function SuscripcionBadge({ estado }: { estado: 'pagado' | 'pendiente' | 'vencido' | null }) {
  if (!estado) {
    return (
      <span className="text-xs rounded-full px-2.5 py-1 font-medium"
        style={{ background: 'rgba(92,92,89,0.15)', color: '#5C5C59' }}>
        Sin datos
      </span>
    )
  }
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pagado:   { bg: 'rgba(122,182,25,0.12)',  color: '#7AB619', label: 'Al día' },
    pendiente: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Pendiente' },
    vencido:  { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', label: 'Vencida' },
  }
  const s = styles[estado]
  return (
    <span className="text-xs rounded-full px-2.5 py-1 font-medium"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ahora    = new Date()
  const hoy      = format(ahora, 'yyyy-MM-dd')
  const mesStart = startOfMonth(ahora).toISOString()
  const mesEnd   = endOfMonth(ahora).toISOString()

  const [
    { count: totalClientes },
    { count: clientesActivos },
    { count: nuevosEsteMes },
    { count: citasMes },
    { data: suscripcionesActivas },
    { data: negociosRecientes },
  ] = await Promise.all([
    supabase.from('negocios')
      .select('*', { count: 'exact', head: true }),

    supabase.from('negocios')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true),

    supabase.from('negocios')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', mesStart).lte('created_at', mesEnd),

    supabase.from('citas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_inicio', mesStart).lte('fecha_inicio', mesEnd),

    // Suscripciones vigentes pagadas (para calcular MRR y al-día)
    supabase.from('suscripciones')
      .select('negocio_id, monto, estado')
      .eq('estado', 'pagado')
      .lte('periodo_inicio', hoy)
      .gte('periodo_fin', hoy),

    supabase.from('negocios')
      .select('id, nombre, rubro, activo, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // MRR: suma de suscripciones vigentes y pagadas
  const mrr = (suscripcionesActivas ?? []).reduce((acc, s) => acc + parseFloat(String(s.monto)), 0)

  // Clientes al día: negocio_ids únicos con suscripción vigente pagada
  const negocioIdsAlDia = new Set((suscripcionesActivas ?? []).map(s => s.negocio_id))
  const clientesAlDia  = negocioIdsAlDia.size

  // Para la tabla: obtener última suscripción de cada médico reciente
  const medicoIds = (negociosRecientes ?? []).map(m => m.id)
  const { data: ultimasSuscripciones } = await supabase
    .from('suscripciones')
    .select('negocio_id, estado, periodo_fin')
    .in('negocio_id', medicoIds.length > 0 ? medicoIds : ['none'])
    .order('periodo_fin', { ascending: false })

  // Mapa negocio_id → estado de suscripción más reciente
  const suscripcionPorNegocio = new Map<string, 'pagado' | 'pendiente' | 'vencido'>()
  for (const s of ultimasSuscripciones ?? []) {
    if (!suscripcionPorNegocio.has(s.negocio_id)) {
      suscripcionPorNegocio.set(s.negocio_id, s.estado as 'pagado' | 'pendiente' | 'vencido')
    }
  }

  const fechaHoy = format(ahora, "EEEE d 'de' MMMM", { locale: es })
  const mrrFormateado = mrr.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  return (
    <div className="p-6 w-[85%] mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 capitalize" style={{ color: '#F0F0EE' }}>
          {fechaHoy}
        </h1>
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Resumen de la plataforma SimplificIA
        </p>
      </div>

      {/* Stats — fila 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          titulo="Total clientes"
          valor={totalClientes ?? 0}
          subtitulo="Médicos registrados"
          icon={<Users size={20} />}
          color="#7AB619"
        />
        <StatCard
          titulo="Clientes activos"
          valor={clientesActivos ?? 0}
          subtitulo={`de ${totalClientes ?? 0} en total`}
          icon={<UserCheck size={20} />}
          color="#3B82F6"
        />
        <StatCard
          titulo="Nuevos este mes"
          valor={nuevosEsteMes ?? 0}
          subtitulo={format(ahora, 'MMMM yyyy', { locale: es })}
          icon={<UserPlus size={20} />}
          color="#8B5CF6"
        />
      </div>

      {/* Stats — fila 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          titulo="MRR"
          valor={mrrFormateado}
          subtitulo="Ingresos mensuales recurrentes"
          icon={<DollarSign size={20} />}
          color="#7AB619"
        />
        <StatCard
          titulo="Al día"
          valor={clientesAlDia}
          subtitulo="Con suscripción vigente"
          icon={<CreditCard size={20} />}
          color="#10B981"
        />
        <StatCard
          titulo="Citas del mes"
          valor={citasMes ?? 0}
          subtitulo="En toda la plataforma"
          icon={<Calendar size={20} />}
          color="#F59E0B"
        />
      </div>

      {/* Tabla clientes recientes */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <h2 className="text-base font-semibold" style={{ color: '#F0F0EE' }}>
            Clientes recientes
          </h2>
          <a href="/admin/negocios"
            className="text-xs font-medium transition-opacity hover:opacity-75"
            style={{ color: '#7AB619' }}>
            Ver todos →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3D3D3B' }}>
                {['Nombre', 'Rubro', 'Estado', 'Suscripción', 'Registrado'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: '#5C5C59' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(negociosRecientes ?? []).map((negocio, i) => (
                <tr key={negocio.id}
                  style={{
                    borderBottom: i < (negociosRecientes?.length ?? 0) - 1 ? '1px solid #3D3D3B' : 'none',
                  }}>
                  <td className="px-6 py-4 font-medium" style={{ color: '#F0F0EE' }}>
                    {negocio.nombre}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#9A9A96' }}>
                    {negocio.rubro}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs rounded-full px-2.5 py-1 font-medium"
                      style={negocio.activo
                        ? { background: 'rgba(122,182,25,0.12)', color: '#7AB619' }
                        : { background: 'rgba(92,92,89,0.15)', color: '#5C5C59' }
                      }>
                      {negocio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <SuscripcionBadge estado={suscripcionPorNegocio.get(negocio.id) ?? null} />
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: '#5C5C59' }}>
                    {format(new Date(negocio.created_at), 'd MMM yyyy', { locale: es })}
                  </td>
                </tr>
              ))}
              {(negociosRecientes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm"
                    style={{ color: '#5C5C59' }}>
                    No hay clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
