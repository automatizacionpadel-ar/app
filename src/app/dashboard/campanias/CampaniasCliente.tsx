// src/app/dashboard/campanias/CampaniasCliente.tsx
'use client'

import { useState, useRef } from 'react'
import { Megaphone, Send, Users, CheckCircle, XCircle, Clock, AlertCircle, ImagePlus, X, Bold } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MensajePromo } from '@/types'

type Segmento = 'todos' | 'inactivos_30d' | 'inactivos_60d'

const SEGMENTO_LABEL: Record<Segmento, string> = {
  todos:         'Todos los clientes',
  inactivos_30d: 'Inactivos hace +30 días',
  inactivos_60d: 'Inactivos hace +60 días',
}

const EMOJIS = [
  '😀','😊','😍','🥳','😎','🤩','🎉','✨','👋','💪',
  '🎁','🌟','⭐','💯','🔥','✅','💰','💎','🎯','📣',
  '🗓️','❤️','💚','👍','🙌','🏥','💊','🩺','🫶','📸',
  '🎨','🛍️','🤝','🆕','🎀',
]

// ─── Formulario nueva campaña ─────────────────────────────────────────────────
function FormularioCampania({
  negocioId, totalConPush, onEnviada
}: {
  negocioId: string | null
  totalConPush: number
  onEnviada: (campania: MensajePromo) => void
}) {
  const [titulo, setTitulo]           = useState('')
  const [contenido, setContenido]     = useState('')
  const [segmento, setSegmento]       = useState<Segmento>('todos')
  const [loading, setLoading]         = useState(false)
  const [resultado, setResultado]     = useState<{ enviados: number; fallidos: number } | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [imagenPrevia, setImagenPrevia] = useState<{ file: File; preview: string } | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [emojiOpen, setEmojiOpen]     = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)

  const caracteresRestantes = 500 - contenido.length

  function insertBold() {
    const ta = textareaRef.current
    if (!ta) return
    const start    = ta.selectionStart
    const end      = ta.selectionEnd
    const selected = contenido.slice(start, end)
    if (selected) {
      const next = contenido.slice(0, start) + `**${selected}**` + contenido.slice(end)
      setContenido(next)
      setTimeout(() => ta.setSelectionRange(end + 4, end + 4), 0)
    } else {
      const next = contenido.slice(0, start) + '**texto**' + contenido.slice(end)
      setContenido(next)
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 7) }, 0)
    }
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const next  = contenido.slice(0, start) + emoji + contenido.slice(start)
    setContenido(next)
    setEmojiOpen(false)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length) }, 0)
  }

  function seleccionarImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenPrevia({ file, preview: URL.createObjectURL(file) })
    e.target.value = ''
  }

  function quitarImagen() {
    if (imagenPrevia) URL.revokeObjectURL(imagenPrevia.preview)
    setImagenPrevia(null)
  }

  async function handleEnviar() {
    if (!titulo.trim() || !contenido.trim()) return
    if (!negocioId) return

    setLoading(true)
    setError(null)
    setResultado(null)

    let imageUrl: string | undefined

    if (imagenPrevia) {
      setUploadingImg(true)
      try {
        const fd = new FormData()
        fd.append('imagen', imagenPrevia.file)
        const res  = await fetch('/api/chat/imagen', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) imageUrl = data.url
      } catch {}
      setUploadingImg(false)
      URL.revokeObjectURL(imagenPrevia.preview)
      setImagenPrevia(null)
    }

    try {
      const res = await fetch('/api/campanias/enviar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, contenido, image_url: imageUrl, segmento, negocio_id: negocioId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al enviar la campaña')
        return
      }

      setResultado({ enviados: data.enviados, fallidos: data.fallidos })
      onEnviada(data.campania)
      setTitulo('')
      setContenido('')
      setSegmento('todos')
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl p-6"
      style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#F0F0EE' }}>
        Nueva campaña
      </h2>

      {/* Resultado */}
      {resultado && (
        <div className="flex items-center gap-2 rounded-lg p-3 mb-4 text-sm"
          style={{ background: 'rgba(122,182,25,0.1)', border: '1px solid rgba(122,182,25,0.2)', color: '#7AB619' }}>
          <CheckCircle size={15} />
          Enviada a {resultado.enviados} pacientes
          {resultado.fallidos > 0 && (
            <span style={{ color: '#F59E0B' }}> · {resultado.fallidos} fallidos</span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Título */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A96' }}>
            Título de la notificación
          </label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Promoción de verano"
            maxLength={60}
            className="w-full rounded-lg px-4 py-2.5 text-sm"
            style={{
              background: '#20201F', border: '1px solid #3D3D3B',
              color: '#F0F0EE', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = '#7AB619')}
            onBlur={e => (e.target.style.borderColor = '#3D3D3B')}
          />
        </div>

        {/* Contenido */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: '#9A9A96' }}>
              Mensaje
            </label>
            <span className="text-xs" style={{ color: caracteresRestantes < 50 ? '#F59E0B' : '#5C5C59' }}>
              {caracteresRestantes} restantes
            </span>
          </div>

          {/* Editor con toolbar */}
          <div className="rounded-lg overflow-visible"
            style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5"
              style={{ borderBottom: '1px solid #3D3D3B' }}>

              {/* Bold */}
              <button
                type="button"
                onClick={insertBold}
                className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                style={{ color: '#9A9A96' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9A9A96')}
                title="Negrita">
                <Bold size={14} />
              </button>

              {/* Emoji */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEmojiOpen(o => !o)}
                  className="w-7 h-7 rounded flex items-center justify-center text-base transition-colors"
                  title="Emoji">
                  😊
                </button>
                {emojiOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                    <div className="absolute top-8 left-0 z-20 rounded-xl p-2 shadow-lg"
                      style={{ background: '#2A2A29', border: '1px solid #3D3D3B', width: '228px' }}>
                      <div className="grid grid-cols-7 gap-0.5">
                        {EMOJIS.map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => insertEmoji(em)}
                            className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                            style={{ fontSize: '18px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#3D3D3B')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Imagen */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                style={{ color: imagenPrevia ? '#7AB619' : '#9A9A96' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
                onMouseLeave={e => (e.currentTarget.style.color = imagenPrevia ? '#7AB619' : '#9A9A96')}
                title="Adjuntar imagen">
                <ImagePlus size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={seleccionarImagen}
              />
            </div>

            {/* Preview imagen */}
            {imagenPrevia && (
              <div className="px-3 pt-2 relative inline-block">
                <img
                  src={imagenPrevia.preview}
                  alt="Preview"
                  className="rounded-lg"
                  style={{ height: '72px', width: 'auto', maxWidth: '140px', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="absolute top-0.5 right-0 rounded-full p-0.5"
                  style={{ background: '#EF4444', color: '#fff' }}>
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              placeholder="Escribí el mensaje que verán tus pacientes..."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2.5 text-sm resize-none bg-transparent outline-none"
              style={{ color: '#F0F0EE' }}
            />
          </div>
        </div>

        {/* Segmento */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A96' }}>
            Destinatarios
          </label>
          <select
            value={segmento}
            onChange={e => setSegmento(e.target.value as Segmento)}
            className="w-full rounded-lg px-4 py-2.5 text-sm"
            style={{
              background: '#20201F', border: '1px solid #3D3D3B',
              color: '#F0F0EE', outline: 'none',
            }}>
            {(Object.entries(SEGMENTO_LABEL) as [Segmento, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Preview destinatarios */}
        <div className="flex items-center gap-2 rounded-lg px-4 py-3"
          style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
          <Users size={14} style={{ color: '#7AB619' }} />
          <p className="text-sm" style={{ color: '#9A9A96' }}>
            Se enviará a aproximadamente{' '}
            <span style={{ color: '#F0F0EE', fontWeight: 600 }}>
              {segmento === 'todos' ? totalConPush : Math.floor(totalConPush * 0.4)}
            </span>{' '}
            pacientes con notificaciones activas
          </p>
        </div>

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={loading || uploadingImg || !titulo.trim() || !contenido.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#7AB619', color: '#20201F' }}>
          {loading || uploadingImg ? (
            <span className="animate-pulse">
              {uploadingImg ? 'Subiendo imagen...' : 'Enviando...'}
            </span>
          ) : (
            <>
              <Send size={15} />
              Enviar campaña
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Historial ────────────────────────────────────────────────────────────────
function HistorialCampanias({ campanias }: { campanias: MensajePromo[] }) {
  if (campanias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Megaphone size={36} style={{ color: '#3D3D3B' }} className="mb-3" />
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Todavía no enviaste ninguna campaña
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {campanias.map(c => (
        <div key={c.id} className="rounded-lg px-4 py-3.5"
          style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium" style={{ color: '#F0F0EE' }}>{c.titulo}</p>
            {c.borrador ? (
              <span className="text-[10px] rounded-full px-2 py-0.5 flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                Borrador
              </span>
            ) : (
              <span className="text-[10px] rounded-full px-2 py-0.5 flex-shrink-0"
                style={{ background: 'rgba(122,182,25,0.15)', color: '#7AB619' }}>
                Enviada
              </span>
            )}
          </div>
          <p className="text-xs mb-2 line-clamp-2" style={{ color: '#5C5C59' }}>{c.contenido}</p>
          <div className="flex items-center gap-4">
            {c.enviado_at && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#5C5C59' }}>
                <Clock size={11} />
                {format(new Date(c.enviado_at), "d MMM yyyy HH:mm", { locale: es })}
              </span>
            )}
            {!c.borrador && (
              <>
                <span className="flex items-center gap-1 text-xs" style={{ color: '#7AB619' }}>
                  <CheckCircle size={11} />
                  {c.total_enviados} enviados
                </span>
                {c.total_fallidos > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                    <XCircle size={11} />
                    {c.total_fallidos} fallidos
                  </span>
                )}
              </>
            )}
            <span className="text-xs ml-auto" style={{ color: '#5C5C59' }}>
              {SEGMENTO_LABEL[c.segmento as Segmento]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CampaniasCliente({
  campaniasIniciales, negocioId, totalConPush
}: {
  campaniasIniciales: MensajePromo[]
  negocioId: string | null
  totalConPush: number
}) {
  const [campanias, setCampanias] = useState(campaniasIniciales)

  function handleEnviada(nueva: MensajePromo) {
    setCampanias(prev => [nueva, ...prev])
  }

  return (
    <div className="p-6 w-[85%] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Campañas</h1>
        <p className="text-sm" style={{ color: '#5C5C59' }}>
          Enviá notificaciones push a tus pacientes
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <FormularioCampania
          negocioId={negocioId}
          totalConPush={totalConPush}
          onEnviada={handleEnviada}
        />

        {/* Historial */}
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: '#F0F0EE' }}>
            Historial
          </h2>
          <HistorialCampanias campanias={campanias} />
        </div>
      </div>
    </div>
  )
}
