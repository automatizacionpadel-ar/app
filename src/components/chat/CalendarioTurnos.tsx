'use client'

import { useState, useEffect } from 'react'
import { Loader2, Banknote, CreditCard, Smartphone } from 'lucide-react'

interface DiaDisponible {
  fecha:  string
  label:  string
  slots:  string[]
}

type MetodoPago = 'efectivo' | 'transferencia' | 'mercadopago'

interface Props {
  medicoId:   string
  pacienteId: string | null
  onConfirmed: (label: string) => void
}

const METODOS: { id: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { id: 'efectivo',     label: 'Efectivo',      icon: <Banknote size={16} /> },
  { id: 'transferencia', label: 'Transferencia', icon: <CreditCard size={16} /> },
  { id: 'mercadopago',  label: 'Mercado Pago',  icon: <Smartphone size={16} /> },
]

export default function CalendarioTurnos({ medicoId, pacienteId, onConfirmed }: Props) {
  const [dias,             setDias]             = useState<DiaDisponible[]>([])
  const [diaSeleccionado,  setDiaSeleccionado]  = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [metodoPago,       setMetodoPago]       = useState<MetodoPago | null>(null)
  const [step,             setStep]             = useState<'fecha' | 'hora' | 'pago'>('fecha')
  const [loading,          setLoading]          = useState(true)
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/citas/disponibles?medico_id=${medicoId}`)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: DiaDisponible[]) => {
        setDias(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar turnos. Intentá de nuevo.')
        setLoading(false)
      })
  }, [medicoId])

  async function confirmarTurno() {
    if (!diaSeleccionado || !horaSeleccionada || !metodoPago || !pacienteId) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/citas/crear', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medico_id:   medicoId,
          paciente_id: pacienteId,
          fecha:       diaSeleccionado.fecha,
          hora:        horaSeleccionada,
          metodo_pago: metodoPago,
        }),
      })

      if (res.status === 409) {
        setError('Ese turno ya fue tomado, elegí otro.')
        setStep('fecha')
        setDiaSeleccionado(null)
        setHoraSeleccionada(null)
        setMetodoPago(null)
        return
      }

      if (!res.ok) {
        setError('Error al confirmar. Intentá de nuevo.')
        return
      }

      onConfirmed(`${diaSeleccionado.label} a las ${horaSeleccionada}`)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const box: React.CSSProperties = {
    background:   '#2A2A29',
    border:       '1px solid #3D3D3B',
    borderRadius: '12px',
    padding:      '14px',
    marginTop:    '6px',
  }

  const chipBase: React.CSSProperties = {
    borderRadius: '20px',
    padding:      '6px 8px',
    fontSize:     '11px',
    fontWeight:   600,
    cursor:       'pointer',
    whiteSpace:   'nowrap',
    textAlign:    'center',
  }

  if (loading) {
    return (
      <div style={box} className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" style={{ color: '#7AB619' }} />
        <span style={{ color: '#5C5C59', fontSize: '13px' }}>Cargando turnos...</span>
      </div>
    )
  }

  if (dias.length === 0 && !error) {
    return (
      <div style={box}>
        <p style={{ color: '#5C5C59', fontSize: '13px' }}>
          No hay turnos disponibles en los próximos 14 días.
        </p>
      </div>
    )
  }

  return (
    <div style={box}>

      {/* Step 1: fecha */}
      {step === 'fecha' && (
        <div>
          <p style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '10px' }}>
            Seleccioná una fecha:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {dias.map(dia => (
              <button
                key={dia.fecha}
                disabled={submitting}
                onClick={() => { setError(null); setDiaSeleccionado(dia); setStep('hora') }}
                style={{
                  ...chipBase,
                  background: 'rgba(122,182,25,0.15)',
                  color:      '#7AB619',
                  border:     '1px solid rgba(122,182,25,0.3)',
                  opacity:    submitting ? 0.5 : 1,
                }}
              >
                {dia.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: hora */}
      {step === 'hora' && diaSeleccionado && (
        <div>
          <button
            onClick={() => { setStep('fecha'); setHoraSeleccionada(null) }}
            style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {diaSeleccionado.label}
          </button>
          <p style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '10px' }}>
            Horarios disponibles:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {diaSeleccionado.slots.map(slot => (
              <button
                key={slot}
                disabled={submitting}
                onClick={() => { setError(null); setHoraSeleccionada(slot); setStep('pago') }}
                style={{
                  background:   'rgba(122,182,25,0.15)',
                  color:        '#7AB619',
                  border:       '1px solid rgba(122,182,25,0.3)',
                  borderRadius: '8px',
                  padding:      '5px 10px',
                  fontSize:     '12px',
                  cursor:       'pointer',
                  opacity:      submitting ? 0.5 : 1,
                }}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: pago */}
      {step === 'pago' && diaSeleccionado && horaSeleccionada && (
        <div>
          <button
            onClick={() => { setStep('hora'); setMetodoPago(null); setError(null) }}
            style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {diaSeleccionado.label} · {horaSeleccionada}
          </button>

          <p style={{ color: '#F0F0EE', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
            ¿Cómo vas a pagar?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {METODOS.map(m => {
              const selected = metodoPago === m.id
              return (
                <button
                  key={m.id}
                  disabled={submitting}
                  onClick={() => setMetodoPago(m.id)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '10px',
                    background:     selected ? 'rgba(122,182,25,0.15)' : '#20201F',
                    border:         selected ? '1px solid rgba(122,182,25,0.5)' : '1px solid #3D3D3B',
                    borderRadius:   '10px',
                    padding:        '10px 14px',
                    color:          selected ? '#7AB619' : '#9A9A96',
                    fontSize:       '13px',
                    fontWeight:     selected ? 600 : 400,
                    cursor:         'pointer',
                    textAlign:      'left',
                    transition:     'all 0.15s',
                  }}
                >
                  {m.icon}
                  {m.label}
                </button>
              )
            })}
          </div>

          {error && (
            <p style={{ color: '#FF6B6B', fontSize: '12px', marginBottom: '8px' }}>{error}</p>
          )}

          <button
            onClick={confirmarTurno}
            disabled={!metodoPago || submitting}
            style={{
              background:     metodoPago ? '#7AB619' : '#3D3D3B',
              color:          metodoPago ? '#20201F' : '#5C5C59',
              border:         'none',
              borderRadius:   '10px',
              padding:        '11px',
              fontSize:       '13px',
              fontWeight:     700,
              width:          '100%',
              cursor:         metodoPago && !submitting ? 'pointer' : 'not-allowed',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '6px',
              transition:     'all 0.15s',
            }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirmar turno
          </button>
        </div>
      )}

      {error && step !== 'pago' && (
        <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  )
}
