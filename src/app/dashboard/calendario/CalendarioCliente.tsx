// src/app/dashboard/calendario/CalendarioCliente.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin   from '@fullcalendar/daygrid'
import timeGridPlugin  from '@fullcalendar/timegrid'
import listPlugin      from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale        from '@fullcalendar/core/locales/es'
import { createClient } from '@/lib/supabase/client'
import { X, User, Clock, Stethoscope, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { EstadoCita } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_COLOR: Record<EstadoCita, string> = {
  pendiente:  '#F59E0B',
  confirmada: '#7AB619',
  completada: '#5C5C59',
  cancelada:  '#EF4444',
  no_asistio: '#8B5CF6',
}

const ESTADO_LABEL: Record<EstadoCita, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_asistio: 'No asistió',
}

function citaToEvent(cita: any) {
  const paciente = cita.pacientes
  const nombre   = paciente ? `${paciente.nombre} ${paciente.apellido ?? ''}`.trim() : 'Paciente'
  return {
    id:              cita.id,
    title:           nombre,
    start:           cita.fecha_inicio,
    end:             cita.fecha_fin,
    classNames:      [`fc-event-${cita.estado}`],
    backgroundColor: ESTADO_COLOR[cita.estado as EstadoCita] ?? '#7AB619',
    borderColor:     ESTADO_COLOR[cita.estado as EstadoCita] ?? '#7AB619',
    textColor:       ['pendiente'].includes(cita.estado) ? '#20201F' : '#20201F',
    extendedProps:   { cita },
  }
}

// ─── Modal detalle cita ───────────────────────────────────────────────────────

function ModalCita({ cita, onClose, onEstadoChange }: {
  cita: any
  onClose: () => void
  onEstadoChange: (id: string, estado: EstadoCita) => void
}) {
  const [loading, setLoading] = useState(false)
  const paciente = cita.pacientes
  const nombre   = paciente ? `${paciente.nombre} ${paciente.apellido ?? ''}`.trim() : 'Paciente'

  async function cambiarEstado(nuevoEstado: EstadoCita) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', cita.id)
    onEstadoChange(cita.id, nuevoEstado)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl animate-fade-up"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-xs rounded-full px-2.5 py-1 font-medium"
              style={{
                background: `${ESTADO_COLOR[cita.estado as EstadoCita]}18`,
                color: ESTADO_COLOR[cita.estado as EstadoCita]
              }}>
              {ESTADO_LABEL[cita.estado as EstadoCita]}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1"
            style={{ color: '#5C5C59' }}>
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <User size={16} style={{ color: '#7AB619' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{nombre}</p>
              {paciente?.celular && (
                <p className="text-xs" style={{ color: '#5C5C59' }}>{paciente.celular}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock size={16} style={{ color: '#7AB619' }} />
            <div>
              <p className="text-sm" style={{ color: '#F0F0EE' }}>
                {format(new Date(cita.fecha_inicio), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs" style={{ color: '#5C5C59' }}>
                {format(new Date(cita.fecha_inicio), 'HH:mm')} — {format(new Date(cita.fecha_fin), 'HH:mm')}
              </p>
            </div>
          </div>

          {cita.motivo_consulta && (
            <div className="flex items-start gap-3">
              <Stethoscope size={16} style={{ color: '#7AB619', marginTop: 2 }} />
              <p className="text-sm" style={{ color: '#9A9A96' }}>{cita.motivo_consulta}</p>
            </div>
          )}
        </div>

        {/* Acciones de estado */}
        {cita.estado !== 'cancelada' && cita.estado !== 'completada' && (
          <div className="grid grid-cols-2 gap-2">
            {cita.estado === 'pendiente' && (
              <button onClick={() => cambiarEstado('confirmada')} disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                <CheckCircle size={14} /> Confirmar
              </button>
            )}
            <button onClick={() => cambiarEstado('completada')} disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(92,92,89,0.2)', color: '#9A9A96' }}>
              <CheckCircle size={14} /> Completar
            </button>
            <button onClick={() => cambiarEstado('no_asistio')} disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
              <AlertCircle size={14} /> No asistió
            </button>
            <button onClick={() => cambiarEstado('cancelada')} disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <XCircle size={14} /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarioCliente({ citasIniciales, medicoId }: {
  citasIniciales: any[]
  medicoId: string | null
}) {
  const [events, setEvents]     = useState(citasIniciales.map(citaToEvent))
  const [citaModal, setCitaModal] = useState<any | null>(null)

  // Supabase Realtime — escucha cambios en la tabla citas
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('citas-realtime')
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'citas',
          filter: medicoId ? `medico_id=eq.${medicoId}` : undefined,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch completo con paciente para tener el nombre
            const { data } = await supabase
              .from('citas')
              .select('id, fecha_inicio, fecha_fin, estado, motivo_consulta, pacientes(nombre, apellido)')
              .eq('id', payload.new.id)
              .single()
            if (data) setEvents(prev => [...prev, citaToEvent(data)])
          }

          if (payload.eventType === 'UPDATE') {
            setEvents(prev => prev.map(ev =>
              ev.id === payload.new.id
                ? { ...ev,
                    classNames:      [`fc-event-${payload.new.estado}`],
                    backgroundColor: ESTADO_COLOR[payload.new.estado as EstadoCita],
                    borderColor:     ESTADO_COLOR[payload.new.estado as EstadoCita],
                    extendedProps:   { cita: { ...ev.extendedProps.cita, ...payload.new } }
                  }
                : ev
            ))
          }

          if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(ev => ev.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [medicoId])

  function handleEstadoChange(id: string, estado: EstadoCita) {
    setEvents(prev => prev.map(ev =>
      ev.id === id
        ? { ...ev,
            classNames:      [`fc-event-${estado}`],
            backgroundColor: ESTADO_COLOR[estado],
            borderColor:     ESTADO_COLOR[estado],
            extendedProps:   { cita: { ...ev.extendedProps.cita, estado } }
          }
        : ev
    ))
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Calendario</h1>
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Las citas se actualizan en tiempo real
        </p>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-5">
        {(Object.entries(ESTADO_LABEL) as [EstadoCita, string][]).map(([estado, label]) => (
          <div key={estado} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADO_COLOR[estado] }} />
            <span className="text-xs" style={{ color: '#9A9A96' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            locale={esLocale}
            initialView="timeGridWeek"
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={events}
            eventClick={info => setCitaModal(info.event.extendedProps.cita)}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="calc(100vh - 260px)"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            nowIndicator
            businessHours={{ daysOfWeek: [1,2,3,4,5,6], startTime: '09:00', endTime: '20:00' }}
          />
        </div>
      </div>

      {/* Modal */}
      {citaModal && (
        <ModalCita
          cita={citaModal}
          onClose={() => setCitaModal(null)}
          onEstadoChange={handleEstadoChange}
        />
      )}
    </div>
  )
}
