// src/app/dashboard/config/ConfigCliente.tsx
'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Calendar, Stethoscope, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import type { Medico, HorarioDia } from '@/types'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const
type Dia = typeof DIAS[number]

const DIA_CHIP: Record<Dia, string> = {
  lunes:'L', martes:'M', miercoles:'Mi',
  jueves:'J', viernes:'V', sabado:'S', domingo:'D',
}
const DIA_LABEL: Record<Dia, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo',
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionCard({ icon, color, titulo, subtitulo, children }: {
  icon: React.ReactNode; color: string
  titulo: string; subtitulo: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
      <div className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid #3D3D3B' }}>
        <div className="rounded-lg p-2" style={{ background: `${color}18` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>{titulo}</h2>
          <p className="text-xs" style={{ color: '#5C5C59' }}>{subtitulo}</p>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-5">{children}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A96' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg px-4 py-2.5 text-sm"
      style={{
        background: '#20201F', border: '1px solid #3D3D3B',
        color: '#F0F0EE', outline: 'none', ...props.style,
      }}
      onFocus={e => (e.currentTarget.style.borderColor = '#7AB619')}
      onBlur={e  => (e.currentTarget.style.borderColor = '#3D3D3B')}
    />
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 36, height: 20, background: checked ? '#7AB619' : '#3D3D3B' }}>
      <span className="absolute rounded-full bg-white transition-transform"
        style={{
          width: 16, height: 16, top: 2, left: 2,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }} />
    </button>
  )
}

function ImageUpload({ label, hint, value, storagePath, onUploaded, shape }: {
  label: string; hint: string; value: string | null
  storagePath: string; onUploaded: (url: string) => void
  shape: 'circle' | 'square'
}) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('La imagen no puede superar los 2MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('medico-fotos')
        .upload(storagePath, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('medico-fotos')
        .getPublicUrl(storagePath)
      onUploaded(`${publicUrl}?t=${Date.now()}`)
    } catch {
      setUploadError('Error al subir la imagen. Intentá de nuevo.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => inputRef.current?.click()}
        className="flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width: 64, height: 64,
          borderRadius: shape === 'circle' ? '50%' : 10,
          background: '#3D3D3B',
          border: `2px dashed ${uploading ? '#7AB619' : '#5C5C59'}`,
        }}>
        {value
          ? <img src={value} alt={label} className="w-full h-full object-cover" />
          : uploading
            ? <span className="text-xs" style={{ color: '#7AB619' }}>...</span>
            : <Upload size={20} style={{ color: '#5C5C59' }} />
        }
      </button>
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: '#F0F0EE' }}>{label}</p>
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs rounded-md px-3 py-1.5 transition-opacity disabled:opacity-50"
          style={{ background: '#3D3D3B', color: '#9A9A96' }}>
          {uploading ? 'Subiendo...' : 'Subir imagen'}
        </button>
        {uploadError && (
          <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{uploadError}</p>
        )}
        <p className="text-xs mt-1" style={{ color: '#5C5C59' }}>{hint}</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfigCliente({ medico }: { medico: Medico }) {
  const [form, setForm] = useState(() => ({
    nombre_completo:      medico.nombre_completo,
    telefono:             medico.telefono             ?? '',
    direccion:            medico.direccion            ?? '',
    foto_perfil_url:      medico.foto_perfil_url      as string | null,
    logo_url:             medico.logo_url             as string | null,
    horarios:             Object.fromEntries(
      DIAS.map(d => [
        d,
        medico.horarios?.[d] ?? { inicio: '09:00', fin: '18:00', activo: d !== 'domingo' },
      ])
    ) as Record<Dia, HorarioDia>,
    precio_consulta:      medico.precio_consulta      != null ? String(medico.precio_consulta) : '',
    requiere_sena:        medico.requiere_sena,
    monto_sena:           medico.monto_sena           != null ? String(medico.monto_sena) : '',
    acepta_agendamientos: medico.acepta_agendamientos,
  }))

  const [loading, setLoading] = useState(false)
  const [exito,   setExito]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setHorario(dia: Dia, campo: keyof HorarioDia, valor: string | boolean) {
    setForm(prev => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: { ...prev.horarios[dia], [campo]: valor },
      },
    }))
  }

  async function handleGuardar() {
    setLoading(true)
    setError(null)
    setExito(false)

    // Validate required field
    if (!form.nombre_completo.trim()) {
      setError('El nombre completo es requerido.')
      setLoading(false)
      return
    }

    // Validate schedule times
    const scheduleInvalid = DIAS.some(dia => {
      const h = form.horarios[dia]
      return h.activo && h.fin <= h.inicio
    })
    if (scheduleInvalid) {
      setError('El horario de cierre debe ser posterior al de apertura en todos los días activos.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/medicos/actualizar', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo:      form.nombre_completo,
          telefono:             form.telefono     || null,
          direccion:            form.direccion    || null,
          foto_perfil_url:      form.foto_perfil_url,
          logo_url:             form.logo_url,
          horarios:             form.horarios,
          precio_consulta:      form.precio_consulta ? parseFloat(form.precio_consulta) : null,
          requiere_sena:        form.requiere_sena,
          monto_sena:           form.requiere_sena && form.monto_sena
                                  ? parseFloat(form.monto_sena)
                                  : null,
          acepta_agendamientos: form.acepta_agendamientos,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Configuración</h1>
        <p className="text-sm" style={{ color: '#5C5C59' }}>Administrá la información de tu consultorio</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Sección 1: Información Personal ── */}
        <SectionCard icon={<User size={18} />} color="#7AB619"
          titulo="Información Personal" subtitulo="Tu nombre y datos de contacto">

          <ImageUpload
            label="Foto de perfil"
            hint="JPG, PNG o WebP · máx. 2MB"
            value={form.foto_perfil_url}
            storagePath={`${medico.id}/avatar.jpg`}
            onUploaded={url => setField('foto_perfil_url', url)}
            shape="circle"
          />

          <ImageUpload
            label="Logo del consultorio"
            hint="JPG, PNG o WebP · máx. 2MB"
            value={form.logo_url}
            storagePath={`${medico.id}/logo.jpg`}
            onUploaded={url => setField('logo_url', url)}
            shape="square"
          />

          <Campo label="Nombre completo">
            <Input
              value={form.nombre_completo}
              onChange={e => setField('nombre_completo', e.target.value)}
              placeholder="Dr. Martín García"
            />
          </Campo>

          <Campo label="Celular">
            <Input
              value={form.telefono}
              onChange={e => setField('telefono', e.target.value)}
              placeholder="+54 9 11 5555-0000"
            />
          </Campo>

          <Campo label="Dirección del consultorio">
            <Input
              value={form.direccion}
              onChange={e => setField('direccion', e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </Campo>
        </SectionCard>

        {/* ── Sección 2: Horarios ── */}
        <SectionCard icon={<Calendar size={18} />} color="#3B82F6"
          titulo="Horarios de Atención" subtitulo="Días y horas en que recibís pacientes">

          <div className="flex gap-2 flex-wrap">
            {DIAS.map(dia => (
              <button key={dia} type="button"
                onClick={() => setHorario(dia, 'activo', !form.horarios[dia].activo)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: form.horarios[dia].activo ? '#7AB619' : '#3D3D3B',
                  color:      form.horarios[dia].activo ? '#fff'    : '#5C5C59',
                }}>
                {DIA_CHIP[dia]}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {DIAS.map(dia => {
              const h = form.horarios[dia]
              return (
                <div key={dia} className="flex items-center gap-3">
                  <span className="text-sm w-20 flex-shrink-0"
                    style={{ color: h.activo ? '#F0F0EE' : '#5C5C59' }}>
                    {DIA_LABEL[dia]}
                  </span>
                  {h.activo ? (
                    <>
                      <input type="time" value={h.inicio}
                        onChange={e => setHorario(dia, 'inicio', e.target.value)}
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
                      <span className="text-xs" style={{ color: '#5C5C59' }}>a</span>
                      <input type="time" value={h.fin}
                        onChange={e => setHorario(dia, 'fin', e.target.value)}
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
                    </>
                  ) : (
                    <span className="text-xs italic" style={{ color: '#3D3D3B' }}>Descanso</span>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Sección 3: Propiedades de Citas ── */}
        <SectionCard icon={<Stethoscope size={18} />} color="#F59E0B"
          titulo="Propiedades de Citas" subtitulo="Costos y disponibilidad de agendamiento">

          <Campo label="Precio de la consulta">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#5C5C59' }}>$</span>
              <Input
                type="number" min="0" step="1"
                value={form.precio_consulta}
                onChange={e => setField('precio_consulta', e.target.value)}
                placeholder="5000"
                style={{ width: 160 }}
              />
            </div>
          </Campo>

          <div className="rounded-xl p-4" style={{ background: '#20201F' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium" style={{ color: '#F0F0EE' }}>Requerir seña</p>
                <p className="text-xs mt-0.5" style={{ color: '#5C5C59' }}>
                  El paciente paga un adelanto al reservar
                </p>
              </div>
              <Toggle checked={form.requiere_sena} onChange={v => setField('requiere_sena', v)} />
            </div>
            {form.requiere_sena && (
              <Campo label="Monto de la seña">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#5C5C59' }}>$</span>
                  <Input
                    type="number" min="0" step="1"
                    value={form.monto_sena}
                    onChange={e => setField('monto_sena', e.target.value)}
                    placeholder="1500"
                    style={{ width: 160 }}
                  />
                </div>
              </Campo>
            )}
          </div>

          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: '#20201F' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#F0F0EE' }}>
                Aceptar nuevos agendamientos
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#5C5C59' }}>
                Desactivá esto si no podés atender temporalmente
              </p>
            </div>
            <Toggle
              checked={form.acepta_agendamientos}
              onChange={v => setField('acepta_agendamientos', v)}
            />
          </div>
        </SectionCard>

        {/* ── Feedback ── */}
        {exito && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-3"
            style={{ background: 'rgba(122,182,25,0.1)', border: '1px solid rgba(122,182,25,0.3)' }}>
            <CheckCircle size={16} style={{ color: '#7AB619' }} />
            <span className="text-sm" style={{ color: '#7AB619' }}>Cambios guardados correctamente</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={16} style={{ color: '#EF4444' }} />
            <span className="text-sm" style={{ color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {/* ── Botón único ── */}
        <div className="flex justify-end pb-8">
          <button type="button" onClick={handleGuardar} disabled={loading}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: '#7AB619', color: '#fff' }}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </div>
  )
}
