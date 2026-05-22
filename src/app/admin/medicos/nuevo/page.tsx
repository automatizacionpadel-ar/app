// src/app/admin/medicos/nuevo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Stethoscope, Clock, CreditCard, Bot,
  HelpCircle, Plus, Trash2, ChevronLeft,
  CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react'

// ─── Tipos del formulario ─────────────────────────────────────────────────────
const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const
type Dia = typeof DIAS[number]

const DIA_LABEL: Record<Dia, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
}

// ─── Componentes UI reutilizables ─────────────────────────────────────────────
function Campo({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A96' }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#5C5C59' }}>{hint}</p>}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg px-4 py-2.5 text-sm"
      style={{
        background: '#20201F', border: '1px solid #3D3D3B',
        color: '#F0F0EE', outline: 'none',
        ...(props.style ?? {})
      }}
      onFocus={e => (e.target.style.borderColor = '#7AB619')}
      onBlur={e => (e.target.style.borderColor = '#3D3D3B')}
    />
  )
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg px-4 py-2.5 text-sm resize-none"
      style={{
        background: '#20201F', border: '1px solid #3D3D3B',
        color: '#F0F0EE', outline: 'none',
      }}
      onFocus={e => (e.target.style.borderColor = '#7AB619')}
      onBlur={e => (e.target.style.borderColor = '#3D3D3B')}
    />
  )
}

function SeccionHeader({ icono, titulo, subtitulo }: {
  icono: React.ReactNode; titulo: string; subtitulo: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4"
      style={{ borderBottom: '1px solid #3D3D3B' }}>
      <div className="rounded-lg p-2" style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
        {icono}
      </div>
      <div>
        <h2 className="text-base font-semibold" style={{ color: '#F0F0EE' }}>{titulo}</h2>
        <p className="text-xs" style={{ color: '#5C5C59' }}>{subtitulo}</p>
      </div>
    </div>
  )
}

// ─── Formulario principal ─────────────────────────────────────────────────────
export default function NuevoMedicoPage() {
  const router = useRouter()
  const [paso, setPaso]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  // Estado del formulario
  const [form, setForm] = useState({
    // Básicos
    nombre_completo: '', especialidad: '', telefono: '',
    email: '', direccion: '', descripcion: '',
    duracion_cita_min: 30, dias_anticipacion: 30,
    // Horarios
    horarios: Object.fromEntries(DIAS.map(d => [d, { inicio: '09:00', fin: '18:00', activo: d !== 'domingo' }])),
    // Pagos
    requiere_sena: false, monto_sena: '', alias_mp: '', cbu: '', titular_cuenta: '',
    // Agente
    prompt_personalidad: 'Sos el asistente virtual del consultorio. Sos amable, profesional y conciso.',
    tono: 'amigable',
    mensaje_bienvenida: '¡Hola! Soy el asistente del consultorio. ¿En qué puedo ayudarte?',
    mensaje_confirmacion: 'Tu cita está confirmada para el {{fecha}} a las {{hora}}hs. ¡Te esperamos!',
    mensaje_recordatorio: 'Te recordamos tu cita mañana {{fecha}} a las {{hora}}hs.',
    mensaje_cancelacion: 'Tu cita del {{fecha}} fue cancelada.',
    // FAQs
    faqs: [{ pregunta: '', respuesta: '' }],
    // Acceso
    email_acceso: '', password_acceso: '',
  })

  function setField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setHorario(dia: Dia, campo: string, valor: any) {
    setForm(prev => ({
      ...prev,
      horarios: { ...prev.horarios, [dia]: { ...prev.horarios[dia], [campo]: valor } }
    }))
  }

  function agregarFaq() {
    setForm(prev => ({ ...prev, faqs: [...prev.faqs, { pregunta: '', respuesta: '' }] }))
  }

  function setFaq(i: number, campo: string, valor: string) {
    setForm(prev => {
      const faqs = [...prev.faqs]
      faqs[i] = { ...faqs[i], [campo]: valor }
      return { ...prev, faqs }
    })
  }

  function eliminarFaq(i: number) {
    setForm(prev => ({ ...prev, faqs: prev.faqs.filter((_, idx) => idx !== i) }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/medicos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear el médico'); return }
      router.push('/admin/medicos')
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const PASOS = [
    { n: 1, label: 'Datos' },
    { n: 2, label: 'Horarios' },
    { n: 3, label: 'Pagos' },
    { n: 4, label: 'Agente IA' },
    { n: 5, label: 'FAQs' },
    { n: 6, label: 'Acceso' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="rounded-lg p-2 transition-colors"
          style={{ color: '#5C5C59' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0EE' }}>Nuevo médico</h1>
          <p className="text-xs" style={{ color: '#5C5C59' }}>Completá todos los pasos</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {PASOS.map((p, i) => (
          <div key={p.n} className="flex items-center gap-1 flex-1">
            <button onClick={() => setPaso(p.n)}
              className="flex flex-col items-center gap-1 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  background: paso === p.n ? '#7AB619' : paso > p.n ? 'rgba(122,182,25,0.2)' : '#2A2A29',
                  color: paso === p.n ? '#20201F' : paso > p.n ? '#7AB619' : '#5C5C59',
                  border: `1px solid ${paso >= p.n ? '#7AB619' : '#3D3D3B'}`
                }}>
                {paso > p.n ? <CheckCircle size={14} /> : p.n}
              </div>
              <span className="text-[10px] hidden sm:block"
                style={{ color: paso === p.n ? '#7AB619' : '#5C5C59' }}>
                {p.label}
              </span>
            </button>
            {i < PASOS.length - 1 && (
              <div className="h-px flex-1 mb-4"
                style={{ background: paso > p.n ? '#7AB619' : '#3D3D3B' }} />
            )}
          </div>
        ))}
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Contenido por paso */}
      <div className="rounded-xl p-6 mb-6"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>

        {/* PASO 1 — Datos básicos */}
        {paso === 1 && (
          <>
            <SeccionHeader icono={<User size={18} />} titulo="Datos del consultorio" subtitulo="Información pública del médico" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nombre completo *">
                  <Input value={form.nombre_completo} onChange={e => setField('nombre_completo', e.target.value)} placeholder="Dr. Juan García" />
                </Campo>
                <Campo label="Especialidad *">
                  <Input value={form.especialidad} onChange={e => setField('especialidad', e.target.value)} placeholder="Clínica general" />
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Teléfono">
                  <Input value={form.telefono} onChange={e => setField('telefono', e.target.value)} placeholder="+54 11 1234-5678" />
                </Campo>
                <Campo label="Email">
                  <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="dr@consultorio.com" />
                </Campo>
              </div>
              <Campo label="Dirección">
                <Input value={form.direccion} onChange={e => setField('direccion', e.target.value)} placeholder="Av. Corrientes 1234, CABA" />
              </Campo>
              <Campo label="Descripción">
                <Textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)} placeholder="Breve descripción del consultorio..." rows={3} />
              </Campo>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Duración de consulta (min)">
                  <Input type="number" value={form.duracion_cita_min} onChange={e => setField('duracion_cita_min', parseInt(e.target.value))} min={15} max={120} step={15} />
                </Campo>
                <Campo label="Días de anticipación">
                  <Input type="number" value={form.dias_anticipacion} onChange={e => setField('dias_anticipacion', parseInt(e.target.value))} min={1} max={90} />
                </Campo>
              </div>
            </div>
          </>
        )}

        {/* PASO 2 — Horarios */}
        {paso === 2 && (
          <>
            <SeccionHeader icono={<Clock size={18} />} titulo="Horarios de atención" subtitulo="Configurá los días y horarios disponibles" />
            <div className="space-y-3">
              {DIAS.map(dia => (
                <div key={dia} className="flex items-center gap-3">
                  <button onClick={() => setHorario(dia, 'activo', !form.horarios[dia].activo)}
                    className="w-24 flex-shrink-0 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: form.horarios[dia].activo ? '#7AB619' : 'transparent',
                          border: `1.5px solid ${form.horarios[dia].activo ? '#7AB619' : '#3D3D3B'}`
                        }}>
                        {form.horarios[dia].activo && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#20201F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm" style={{ color: form.horarios[dia].activo ? '#F0F0EE' : '#5C5C59' }}>
                        {DIA_LABEL[dia]}
                      </span>
                    </div>
                  </button>
                  {form.horarios[dia].activo && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input type="time" value={form.horarios[dia].inicio}
                        onChange={e => setHorario(dia, 'inicio', e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '13px' }} />
                      <span style={{ color: '#5C5C59', fontSize: '12px' }}>a</span>
                      <Input type="time" value={form.horarios[dia].fin}
                        onChange={e => setHorario(dia, 'fin', e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '13px' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* PASO 3 — Pagos */}
        {paso === 3 && (
          <>
            <SeccionHeader icono={<CreditCard size={18} />} titulo="Configuración de pagos" subtitulo="Seña y datos bancarios opcionales" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setField('requiere_sena', !form.requiere_sena)}
                  className="w-10 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: form.requiere_sena ? '#7AB619' : '#3D3D3B' }}>
                  <div className="w-4 h-4 rounded-full bg-white transition-all ml-1"
                    style={{ transform: form.requiere_sena ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
                <span className="text-sm" style={{ color: '#F0F0EE' }}>
                  Requiere seña para confirmar la cita
                </span>
              </div>
              {form.requiere_sena && (
                <>
                  <Campo label="Monto de la seña (ARS)">
                    <Input type="number" value={form.monto_sena} onChange={e => setField('monto_sena', e.target.value)} placeholder="5000" />
                  </Campo>
                  <div className="grid grid-cols-2 gap-4">
                    <Campo label="Alias MP">
                      <Input value={form.alias_mp} onChange={e => setField('alias_mp', e.target.value)} placeholder="mi.alias.mp" />
                    </Campo>
                    <Campo label="CBU">
                      <Input value={form.cbu} onChange={e => setField('cbu', e.target.value)} placeholder="0000000000000000000000" />
                    </Campo>
                  </div>
                  <Campo label="Titular de la cuenta">
                    <Input value={form.titular_cuenta} onChange={e => setField('titular_cuenta', e.target.value)} placeholder="Juan García" />
                  </Campo>
                </>
              )}
            </div>
          </>
        )}

        {/* PASO 4 — Agente IA */}
        {paso === 4 && (
          <>
            <SeccionHeader icono={<Bot size={18} />} titulo="Configuración del agente IA" subtitulo="Personalizá cómo habla el asistente" />
            <div className="space-y-4">
              <Campo label="Personalidad del agente" hint="Describí cómo debe comportarse el asistente con los pacientes">
                <Textarea value={form.prompt_personalidad} onChange={e => setField('prompt_personalidad', e.target.value)} rows={4} />
              </Campo>
              <Campo label="Tono de comunicación">
                <select value={form.tono} onChange={e => setField('tono', e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm"
                  style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE', outline: 'none' }}>
                  <option value="amigable">Amigable y cercano</option>
                  <option value="formal">Formal y profesional</option>
                  <option value="neutro">Neutro</option>
                </select>
              </Campo>
              <Campo label="Mensaje de bienvenida">
                <Textarea value={form.mensaje_bienvenida} onChange={e => setField('mensaje_bienvenida', e.target.value)} rows={2} />
              </Campo>
              <Campo label="Mensaje de confirmación" hint="Variables disponibles: {{fecha}}, {{hora}}">
                <Textarea value={form.mensaje_confirmacion} onChange={e => setField('mensaje_confirmacion', e.target.value)} rows={2} />
              </Campo>
              <Campo label="Mensaje de recordatorio">
                <Textarea value={form.mensaje_recordatorio} onChange={e => setField('mensaje_recordatorio', e.target.value)} rows={2} />
              </Campo>
              <Campo label="Mensaje de cancelación">
                <Textarea value={form.mensaje_cancelacion} onChange={e => setField('mensaje_cancelacion', e.target.value)} rows={2} />
              </Campo>
            </div>
          </>
        )}

        {/* PASO 5 — FAQs */}
        {paso === 5 && (
          <>
            <SeccionHeader icono={<HelpCircle size={18} />} titulo="Preguntas frecuentes" subtitulo="El agente usará estas respuestas automáticamente" />
            <div className="space-y-4">
              {form.faqs.map((faq, i) => (
                <div key={i} className="rounded-lg p-4"
                  style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium" style={{ color: '#5C5C59' }}>
                      Pregunta {i + 1}
                    </span>
                    {form.faqs.length > 1 && (
                      <button onClick={() => eliminarFaq(i)}
                        className="p-1 rounded transition-colors"
                        style={{ color: '#5C5C59' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input value={faq.pregunta} onChange={e => setFaq(i, 'pregunta', e.target.value)} placeholder="¿Cuánto dura la consulta?" />
                    <Textarea value={faq.respuesta} onChange={e => setFaq(i, 'respuesta', e.target.value)} placeholder="La consulta tiene una duración de 30 minutos." rows={2} />
                  </div>
                </div>
              ))}
              <button onClick={agregarFaq}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm transition-all"
                style={{ border: '1px dashed #3D3D3B', color: '#5C5C59' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7AB619'; e.currentTarget.style.color = '#7AB619' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#3D3D3B'; e.currentTarget.style.color = '#5C5C59' }}>
                <Plus size={15} /> Agregar pregunta
              </button>
            </div>
          </>
        )}

        {/* PASO 6 — Acceso */}
        {paso === 6 && (
          <>
            <SeccionHeader icono={<User size={18} />} titulo="Credenciales de acceso" subtitulo="El médico usará estas credenciales para entrar al dashboard" />
            <div className="space-y-4">
              <Campo label="Email de acceso *">
                <Input type="email" value={form.email_acceso} onChange={e => setField('email_acceso', e.target.value)} placeholder="dr@consultorio.com" />
              </Campo>
              <Campo label="Contraseña *" hint="Mínimo 8 caracteres">
                <div className="relative">
                  <Input type={showPass ? 'text' : 'password'} value={form.password_acceso}
                    onChange={e => setField('password_acceso', e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#5C5C59' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>
              <div className="rounded-lg p-4"
                style={{ background: '#20201F', border: '1px solid rgba(122,182,25,0.2)' }}>
                <p className="text-xs" style={{ color: '#7AB619' }}>
                  ℹ️ Se creará un usuario en Supabase Auth con estas credenciales. El médico podrá cambiar su contraseña desde el dashboard.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPaso(p => Math.max(1, p - 1))}
          disabled={paso === 1}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
          style={{ border: '1px solid #3D3D3B', color: '#9A9A96' }}>
          Anterior
        </button>

        {paso < 6 ? (
          <button onClick={() => setPaso(p => Math.min(6, p + 1))}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: '#7AB619', color: '#20201F' }}>
            Siguiente
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#7AB619', color: '#20201F' }}>
            {loading ? <span className="animate-pulse-soft">Creando...</span> : (
              <><CheckCircle size={15} /> Crear médico</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
