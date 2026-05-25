'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Banknote, CreditCard, Smartphone, Copy, Check, Upload, ExternalLink } from 'lucide-react'

interface DiaDisponible {
  fecha:  string
  label:  string
  slots:  string[]
}

type MetodoPago = 'efectivo' | 'transferencia' | 'mercadopago'
type Step       = 'fecha' | 'hora' | 'pago' | 'transferencia' | 'mercadopago'

interface MedicoPayment {
  cbu:             string | null
  alias_mp:        string | null
  precio_consulta: number | null
  requiere_sena:   boolean
  monto_sena:      number | null
}

interface MpData {
  tipo:  'checkout' | 'alias'
  link?: string | null
  alias: string | null
  monto: number | null
}

interface Props {
  negocioId:   string
  chatId:      string
  clienteId:   string | null
  onConfirmed: (label: string) => void
}

const METODOS: { id: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { id: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={16} /> },
  { id: 'transferencia', label: 'Transferencia',  icon: <CreditCard size={16} /> },
  { id: 'mercadopago',   label: 'Mercado Pago',   icon: <Smartphone size={16} /> },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background:   copied ? 'rgba(122,182,25,0.15)' : '#20201F',
        border:       `1px solid ${copied ? 'rgba(122,182,25,0.4)' : '#3D3D3B'}`,
        borderRadius: '6px',
        padding:      '3px 8px',
        color:        copied ? '#7AB619' : '#9A9A96',
        fontSize:     '11px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          '4px',
        flexShrink:   0,
        transition:   'all 0.15s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function CalendarioTurnos({ negocioId, chatId, clienteId, onConfirmed }: Props) {
  const [dias,             setDias]             = useState<DiaDisponible[]>([])
  const [diaSeleccionado,  setDiaSeleccionado]  = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [metodoPago,       setMetodoPago]       = useState<MetodoPago | null>(null)
  const [step,             setStep]             = useState<Step>('fecha')
  const [loading,          setLoading]          = useState(true)
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const [citaId,       setCitaId]       = useState<string | null>(null)
  const [medicoPayment, setMedicoPayment] = useState<MedicoPayment | null>(null)
  const [mpData,       setMpData]       = useState<MpData | null>(null)

  const [comprobanteFile, setComprobanteFile]   = useState<{ file: File; preview: string } | null>(null)
  const [uploadingComp,   setUploadingComp]     = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/citas/disponibles?negocio_id=${negocioId}`)
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
  }, [negocioId])

  // Limpia preview al desmontar
  useEffect(() => {
    return () => {
      if (comprobanteFile) URL.revokeObjectURL(comprobanteFile.preview)
    }
  }, [comprobanteFile])

  async function confirmarTurno() {
    if (!diaSeleccionado || !horaSeleccionada || !metodoPago) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/citas/crear', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocio_id:  negocioId,
          cliente_id:  clienteId,   // puede ser null; el backend lo busca por chat_id
          chat_id:     chatId,
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
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'Error al confirmar. Intentá de nuevo.')
        return
      }

      const data = await res.json()
      setCitaId(data.cita_id)
      setMedicoPayment({
        cbu:             data.cbu,
        alias_mp:        data.alias_mp,
        precio_consulta: data.precio_consulta,
        requiere_sena:   data.requiere_sena,
        monto_sena:      data.monto_sena,
      })

      if (metodoPago === 'efectivo') {
        onConfirmed(`${diaSeleccionado.label} a las ${horaSeleccionada}`)

      } else if (metodoPago === 'transferencia') {
        setStep('transferencia')

      } else if (metodoPago === 'mercadopago') {
        const mpRes = await fetch('/api/citas/pago-mp', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cita_id: data.cita_id, negocio_id: negocioId }),
        })
        const mp = await mpRes.json()
        setMpData(mp)
        setStep('mercadopago')
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function seleccionarComprobante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (comprobanteFile) URL.revokeObjectURL(comprobanteFile.preview)
    setComprobanteFile({ file, preview: URL.createObjectURL(file) })
    e.target.value = ''
  }

  async function subirComprobante() {
    if (!comprobanteFile || !citaId || !diaSeleccionado || !horaSeleccionada) return

    setError(null)
    setUploadingComp(true)

    try {
      const fd = new FormData()
      fd.append('imagen', comprobanteFile.file)
      const uploadRes = await fetch('/api/chat/imagen', { method: 'POST', body: fd })

      if (!uploadRes.ok) {
        setError('Error al subir el comprobante. Intentá de nuevo.')
        return
      }

      const { url } = await uploadRes.json()

      await fetch('/api/citas/comprobante', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cita_id: citaId, comprobante_url: url }),
      })

      URL.revokeObjectURL(comprobanteFile.preview)
      setComprobanteFile(null)
      onConfirmed(`${diaSeleccionado.label} a las ${horaSeleccionada}`)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setUploadingComp(false)
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ─── Loading / empty states ───────────────────────────────────────────────────

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

  // ─── Monto helper ────────────────────────────────────────────────────────────

  function montoLabel(payment: MedicoPayment) {
    if (payment.requiere_sena && payment.monto_sena) {
      return `Seña: $${payment.monto_sena.toLocaleString('es-AR')}`
    }
    if (payment.precio_consulta) {
      return `Total: $${payment.precio_consulta.toLocaleString('es-AR')}`
    }
    return null
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

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
          {error && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
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
            {submitting ? 'Reservando...' : 'Confirmar turno'}
          </button>
        </div>
      )}

      {/* Step 4a: transferencia — datos bancarios + subir comprobante */}
      {step === 'transferencia' && diaSeleccionado && horaSeleccionada && medicoPayment && (
        <div>
          {/* Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(122,182,25,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} style={{ color: '#7AB619' }} />
            </div>
            <div>
              <p style={{ color: '#F0F0EE', fontSize: '13px', fontWeight: 600 }}>Turno reservado</p>
              <p style={{ color: '#5C5C59', fontSize: '11px' }}>{diaSeleccionado.label} · {horaSeleccionada}</p>
            </div>
          </div>

          <p style={{ color: '#9A9A96', fontSize: '12px', marginBottom: '10px' }}>
            Realizá la transferencia para confirmar el turno:
          </p>

          {/* Monto */}
          {montoLabel(medicoPayment) && (
            <div style={{ background: '#20201F', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', border: '1px solid #3D3D3B' }}>
              <p style={{ color: '#7AB619', fontSize: '15px', fontWeight: 700 }}>{montoLabel(medicoPayment)}</p>
            </div>
          )}

          {/* Datos bancarios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {medicoPayment.cbu && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#20201F', borderRadius: '8px', padding: '8px 12px', border: '1px solid #3D3D3B' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#5C5C59', fontSize: '10px' }}>CBU</p>
                  <p style={{ color: '#F0F0EE', fontSize: '12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {medicoPayment.cbu}
                  </p>
                </div>
                <CopyButton value={medicoPayment.cbu} />
              </div>
            )}
            {medicoPayment.alias_mp && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#20201F', borderRadius: '8px', padding: '8px 12px', border: '1px solid #3D3D3B' }}>
                <div>
                  <p style={{ color: '#5C5C59', fontSize: '10px' }}>Alias</p>
                  <p style={{ color: '#F0F0EE', fontSize: '12px', fontFamily: 'monospace' }}>
                    {medicoPayment.alias_mp}
                  </p>
                </div>
                <CopyButton value={medicoPayment.alias_mp} />
              </div>
            )}
            {!medicoPayment.cbu && !medicoPayment.alias_mp && (
              <p style={{ color: '#9A9A96', fontSize: '12px' }}>
                Consultá los datos de transferencia con el consultorio.
              </p>
            )}
          </div>

          {/* Upload comprobante */}
          <p style={{ color: '#9A9A96', fontSize: '12px', marginBottom: '8px' }}>
            Una vez transferido, subí el comprobante:
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={seleccionarComprobante}
          />

          {comprobanteFile ? (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={comprobanteFile.preview}
                  alt="Comprobante"
                  style={{ height: '80px', width: 'auto', maxWidth: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #3D3D3B' }}
                />
                <button
                  onClick={() => { URL.revokeObjectURL(comprobanteFile.preview); setComprobanteFile(null) }}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#EF4444', borderRadius: '50%', border: 'none', color: '#fff', width: '18px', height: '18px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '8px',
                width:          '100%',
                padding:        '10px',
                background:     '#20201F',
                border:         '1px dashed #3D3D3B',
                borderRadius:   '10px',
                color:          '#9A9A96',
                fontSize:       '13px',
                cursor:         'pointer',
                marginBottom:   '10px',
              }}
            >
              <Upload size={15} />
              Subir comprobante
            </button>
          )}

          {error && (
            <p style={{ color: '#FF6B6B', fontSize: '12px', marginBottom: '8px' }}>{error}</p>
          )}

          <button
            onClick={subirComprobante}
            disabled={!comprobanteFile || uploadingComp}
            style={{
              background:     comprobanteFile ? '#7AB619' : '#3D3D3B',
              color:          comprobanteFile ? '#20201F' : '#5C5C59',
              border:         'none',
              borderRadius:   '10px',
              padding:        '11px',
              fontSize:       '13px',
              fontWeight:     700,
              width:          '100%',
              cursor:         comprobanteFile && !uploadingComp ? 'pointer' : 'not-allowed',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '6px',
            }}
          >
            {uploadingComp && <Loader2 size={14} className="animate-spin" />}
            {uploadingComp ? 'Enviando...' : 'Confirmar pago'}
          </button>
        </div>
      )}

      {/* Step 4b: Mercado Pago */}
      {step === 'mercadopago' && diaSeleccionado && horaSeleccionada && (
        <div>
          {/* Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(122,182,25,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} style={{ color: '#7AB619' }} />
            </div>
            <div>
              <p style={{ color: '#F0F0EE', fontSize: '13px', fontWeight: 600 }}>Turno reservado</p>
              <p style={{ color: '#5C5C59', fontSize: '11px' }}>{diaSeleccionado.label} · {horaSeleccionada}</p>
            </div>
          </div>

          {submitting ? (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" style={{ color: '#7AB619' }} />
              <span style={{ color: '#5C5C59', fontSize: '13px' }}>Generando link de pago...</span>
            </div>
          ) : mpData ? (
            <>
              {/* Monto */}
              {mpData.monto ? (
                <div style={{ background: '#20201F', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', border: '1px solid #3D3D3B' }}>
                  <p style={{ color: '#7AB619', fontSize: '15px', fontWeight: 700 }}>
                    ${mpData.monto.toLocaleString('es-AR')}
                  </p>
                </div>
              ) : null}

              {/* Checkout Pro link */}
              {mpData.tipo === 'checkout' && mpData.link && (
                <a
                  href={mpData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    gap:            '8px',
                    width:          '100%',
                    padding:        '12px',
                    background:     '#009EE3',
                    borderRadius:   '10px',
                    color:          '#fff',
                    fontSize:       '13px',
                    fontWeight:     700,
                    textDecoration: 'none',
                    marginBottom:   '10px',
                  }}
                >
                  <ExternalLink size={14} />
                  Pagar con Mercado Pago
                </a>
              )}

              {/* Alias fallback */}
              {(mpData.tipo === 'alias' || mpData.alias) && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ color: '#9A9A96', fontSize: '12px', marginBottom: '8px' }}>
                    {mpData.tipo === 'checkout'
                      ? 'O transferí al alias de Mercado Pago:'
                      : 'Transferí a este alias de Mercado Pago:'}
                  </p>
                  {mpData.alias && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#20201F', borderRadius: '8px', padding: '8px 12px', border: '1px solid #3D3D3B' }}>
                      <div>
                        <p style={{ color: '#5C5C59', fontSize: '10px' }}>Alias</p>
                        <p style={{ color: '#F0F0EE', fontSize: '12px', fontFamily: 'monospace' }}>{mpData.alias}</p>
                      </div>
                      <CopyButton value={mpData.alias} />
                    </div>
                  )}
                </div>
              )}

              {!mpData.link && !mpData.alias && (
                <p style={{ color: '#9A9A96', fontSize: '12px', marginBottom: '12px' }}>
                  Consultá los datos de pago con el consultorio.
                </p>
              )}

              {error && (
                <p style={{ color: '#FF6B6B', fontSize: '12px', marginBottom: '8px' }}>{error}</p>
              )}

              <button
                onClick={() => onConfirmed(`${diaSeleccionado.label} a las ${horaSeleccionada}`)}
                style={{
                  background:     '#7AB619',
                  color:          '#20201F',
                  border:         'none',
                  borderRadius:   '10px',
                  padding:        '11px',
                  fontSize:       '13px',
                  fontWeight:     700,
                  width:          '100%',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            '6px',
                }}
              >
                <Check size={15} />
                Ya pagué
              </button>
            </>
          ) : null}
        </div>
      )}

    </div>
  )
}
