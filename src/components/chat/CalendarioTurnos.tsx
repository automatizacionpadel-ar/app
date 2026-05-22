'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface DiaDisponible {
  fecha:  string
  label:  string
  slots:  string[]
}

interface Props {
  medicoId:    string
  onConfirmed: (label: string) => void
}

export default function CalendarioTurnos({ medicoId, onConfirmed }: Props) {
  const [dias,             setDias]             = useState<DiaDisponible[]>([])
  const [diaSeleccionado,  setDiaSeleccionado]  = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [nombre,           setNombre]           = useState('')
  const [telefono,         setTelefono]         = useState('')
  const [step,             setStep]             = useState<'fecha' | 'hora' | 'confirm'>('fecha')
  const [loading,          setLoading]          = useState(true)
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/citas/disponibles?medico_id=${medicoId}`)
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar turnos')
        return r.json()
      })
      .then((data: DiaDisponible[]) => {
        setDias(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Error de conexión. Intentá de nuevo.')
        setLoading(false)
      })
  }, [medicoId])

  async function confirmarTurno() {
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completá tu nombre y teléfono.')
      return
    }
    if (!diaSeleccionado || !horaSeleccionada) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/citas/crear', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medico_id: medicoId,
          nombre:    nombre.trim(),
          telefono:  telefono.trim(),
          fecha:     diaSeleccionado.fecha,
          hora:      horaSeleccionada,
        }),
      })

      if (res.status === 409) {
        setError('Ese turno ya fue tomado, elegí otro.')
        setStep('fecha')
        setDiaSeleccionado(null)
        setHoraSeleccionada(null)
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

  const containerStyle: React.CSSProperties = {
    background:   '#2A2A29',
    border:       '1px solid #3D3D3B',
    borderRadius: '12px',
    padding:      '14px',
    marginTop:    '6px',
  }

  if (loading) {
    return (
      <div style={containerStyle} className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" style={{ color: '#7AB619' }} />
        <span style={{ color: '#5C5C59', fontSize: '13px' }}>Cargando turnos...</span>
      </div>
    )
  }

  if (dias.length === 0 && !error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#5C5C59', fontSize: '13px' }}>
          No hay turnos disponibles en los próximos 14 días.
        </p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
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
                  background:   diaSeleccionado?.fecha === dia.fecha ? '#7AB619' : 'rgba(122,182,25,0.15)',
                  color:        diaSeleccionado?.fecha === dia.fecha ? '#20201F' : '#7AB619',
                  border:       diaSeleccionado?.fecha === dia.fecha ? 'none' : '1px solid rgba(122,182,25,0.3)',
                  borderRadius: '20px',
                  padding:      '6px 8px',
                  fontSize:     '11px',
                  fontWeight:   600,
                  cursor:       submitting ? 'not-allowed' : 'pointer',
                  whiteSpace:   'nowrap',
                  opacity:      submitting ? 0.5 : 1,
                  textAlign:    'center',
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
                onClick={() => { setError(null); setHoraSeleccionada(slot); setStep('confirm') }}
                style={{
                  background:   'rgba(122,182,25,0.15)',
                  color:        '#7AB619',
                  border:       '1px solid rgba(122,182,25,0.3)',
                  borderRadius: '8px',
                  padding:      '5px 10px',
                  fontSize:     '12px',
                  cursor:       submitting ? 'not-allowed' : 'pointer',
                  opacity:      submitting ? 0.5 : 1,
                }}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: confirm */}
      {step === 'confirm' && diaSeleccionado && horaSeleccionada && (
        <div>
          <button
            onClick={() => { setStep('hora'); setNombre(''); setTelefono(''); setError(null) }}
            style={{ color: '#5C5C59', fontSize: '11px', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {diaSeleccionado.label} · {horaSeleccionada}
          </button>
          <p style={{ color: '#F0F0EE', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>
            Confirmá tu turno
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              style={{
                background:   '#20201F',
                border:       '1px solid #3D3D3B',
                borderRadius: '8px',
                padding:      '9px 12px',
                color:        '#F0F0EE',
                fontSize:     '13px',
                outline:      'none',
              }}
            />
            <input
              type="tel"
              placeholder="Tu teléfono"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              style={{
                background:   '#20201F',
                border:       '1px solid #3D3D3B',
                borderRadius: '8px',
                padding:      '9px 12px',
                color:        '#F0F0EE',
                fontSize:     '13px',
                outline:      'none',
              }}
            />
          </div>
          {error && (
            <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>
          )}
          <button
            onClick={confirmarTurno}
            disabled={submitting}
            style={{
              background:     '#7AB619',
              color:          '#20201F',
              border:         'none',
              borderRadius:   '10px',
              padding:        '11px',
              fontSize:       '13px',
              fontWeight:     700,
              width:          '100%',
              marginTop:      '12px',
              cursor:         submitting ? 'not-allowed' : 'pointer',
              opacity:        submitting ? 0.7 : 1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '6px',
            }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirmar turno
          </button>
        </div>
      )}

      {error && step !== 'confirm' && (
        <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>
      )}
    </div>
  )
}
