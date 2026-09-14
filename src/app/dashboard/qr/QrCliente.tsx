'use client'

import { useState } from 'react'
import { QrCode, Copy, Check, Plus, Trash2, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type Campania = { id: string; codigo: string; nombre: string; url: string; scans: number }

export default function QrCliente({
  negocio,
  qrUrl,
  campanias: inicial,
  baseUrl,
}: {
  negocio: { id: string; slug: string; nombre: string; color_marca: string | null }
  qrUrl: string
  campanias: Campania[]
  baseUrl: string
}) {
  const color = negocio.color_marca ?? '#7AB619'
  const [campanias, setCampanias] = useState<Campania[]>(inicial)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [nuevaCamp, setNuevaCamp] = useState({ codigo: '', nombre: '' })
  const [loading, setLoading] = useState(false)

  const copiar = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiado(url)
    setTimeout(() => setCopiado(null), 1500)
  }

  const crearCampania = async () => {
    if (!nuevaCamp.codigo.trim() || !nuevaCamp.nombre.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/qr/campania', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: nuevaCamp.codigo.trim().toLowerCase().replace(/\s+/g, '-'), nombre: nuevaCamp.nombre.trim() }),
      })
      const data = await res.json()
      if (data.campania) setCampanias((prev) => [data.campania, ...prev])
      setNuevaCamp({ codigo: '', nombre: '' })
    } catch {}
    setLoading(false)
  }

  const eliminarCampania = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return
    await fetch(`/api/qr/campania?id=${id}`, { method: 'DELETE' })
    setCampanias((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="w-[85%] mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#F0F0EE' }}>
          QR y NFC
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9A9A96' }}>
          Tu QR apunta a <span style={{ color }}>{qrUrl}</span>. Imprimilo en tarjetas, mostrador o packaging. Compatible con NFC (misma URL).
        </p>
      </div>

      {/* QR Principal */}
      <div className="rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <div className="bg-white rounded-2xl p-4">
          <QRCodeSVG value={qrUrl} size={180} level="H" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>
              QR Principal — {negocio.nombre}
            </p>
            <p className="text-xs break-all mt-1" style={{ color: '#9A9A96' }}>
              {qrUrl}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => copiar(qrUrl)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium" style={{ background: color, color: '#fff' }}>
              {copiado === qrUrl ? <Check size={14} /> : <Copy size={14} />} {copiado === qrUrl ? 'Copiado' : 'Copiar URL'}
            </button>
            <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm" style={{ background: '#3D3D3B', color: '#F0F0EE' }}>
              <ExternalLink size={14} /> Abrir
            </a>
          </div>
          <p className="text-xs" style={{ color: '#5C5C59' }}>
            URL dinámica: podés cambiar el destino sin reimprimir el QR (via redirect en el backend).
          </p>
        </div>
      </div>

      {/* Campañas */}
      <div className="rounded-2xl p-5" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#F0F0EE' }}>
          <QrCode size={16} style={{ color }} /> Campañas / Ubicaciones
        </h2>
        <p className="text-xs mt-1" style={{ color: '#5C5C59' }}>
          Generá QRs diferentes para medir scans por ubicación o campaña. Todos llevan al mismo tenant con <code>?camp=codigo</code>.
        </p>

        <div className="flex flex-col md:flex-row gap-2 mt-4">
          <input value={nuevaCamp.codigo} onChange={(e) => setNuevaCamp((s) => ({ ...s, codigo: e.target.value }))} placeholder="Código (ej: recepcion)" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
          <input value={nuevaCamp.nombre} onChange={(e) => setNuevaCamp((s) => ({ ...s, nombre: e.target.value }))} placeholder="Nombre (ej: Recepción)" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE' }} />
          <button onClick={crearCampania} disabled={loading || !nuevaCamp.codigo.trim() || !nuevaCamp.nombre.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: color, color: '#fff' }}>
            <Plus size={14} /> Crear
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {campanias.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#5C5C59' }}>Sin campañas aún. Creá la primera.</p>}
          {campanias.map((c) => {
            const url = `${baseUrl}/c/${negocio.slug}?camp=${c.codigo}`
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: '#20201F', border: '1px solid #3D3D3B' }}>
                <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
                  <QRCodeSVG value={url} size={48} level="M" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#F0F0EE' }}>
                    {c.nombre} <span style={{ color: '#5C5C59' }}>· {c.codigo}</span>
                  </p>
                  <p className="text-xs truncate" style={{ color: '#9A9A96' }}>
                    {url}
                  </p>
                  <p className="text-xs" style={{ color: '#5C5C59' }}>
                    {c.scans} scans
                  </p>
                </div>
                <button onClick={() => copiar(url)} className="p-2 rounded-lg" style={{ color: copiado === url ? color : '#5C5C59' }}>
                  {copiado === url ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button onClick={() => eliminarCampania(c.id)} className="p-2 rounded-lg" style={{ color: '#EF4444' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
