'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Share2, Copy, Check, Download, X } from 'lucide-react'

export default function ChatButton({ slug }: { slug: string }) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const panelRef              = useRef<HTMLDivElement>(null)
  const qrRef                 = useRef<SVGSVGElement>(null)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/app/${slug}`
    : `/app/${slug}`

  useEffect(() => {
    if (!abierto) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  const copiar = useCallback(async () => {
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }, [url])

  const descargarQR = useCallback(() => {
    const svg = qrRef.current
    if (!svg) return
    const size = 512
    const svgStr = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const svgUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(svgUrl)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `qr-${slug}.png`
      a.click()
    }
    img.src = svgUrl
  }, [slug])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: abierto ? 'rgba(122,182,25,0.15)' : '#2A2A29',
          color:      abierto ? '#7AB619' : '#9A9A96',
          border:     `1px solid ${abierto ? 'rgba(122,182,25,0.3)' : '#3D3D3B'}`,
        }}
        onMouseEnter={e => { if (!abierto) { e.currentTarget.style.color = '#F0F0EE'; e.currentTarget.style.borderColor = '#5C5C59' } }}
        onMouseLeave={e => { if (!abierto) { e.currentTarget.style.color = '#9A9A96'; e.currentTarget.style.borderColor = '#3D3D3B' } }}>
        <Share2 size={15} />
        Link del chat
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 rounded-xl shadow-2xl z-50"
          style={{ background: '#2A2A29', border: '1px solid #3D3D3B', width: '340px' }}>

          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #3D3D3B' }}>
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Link de tu chat</p>
            <button onClick={() => setAbierto(false)}
              className="rounded p-1 transition-colors"
              style={{ color: '#5C5C59' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
              <X size={14} />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <div className="rounded-lg px-3 py-2.5 text-xs font-mono break-all"
              style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#9A9A96' }}>
              {url}
            </div>

            <div className="flex gap-2">
              <button onClick={copiar}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all"
                style={{
                  background: copiado ? 'rgba(122,182,25,0.15)' : '#3D3D3B',
                  color:      copiado ? '#7AB619' : '#F0F0EE',
                  border:     `1px solid ${copiado ? 'rgba(122,182,25,0.3)' : 'transparent'}`,
                }}>
                {copiado ? <Check size={14} /> : <Copy size={14} />}
                {copiado ? 'Copiado' : 'Copiar link'}
              </button>

              <button onClick={descargarQR}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all"
                style={{ background: '#3D3D3B', color: '#F0F0EE' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#4A4A47')}
                onMouseLeave={e => (e.currentTarget.style.background = '#3D3D3B')}>
                <Download size={14} />
                Descargar QR
              </button>
            </div>

            <div className="flex justify-center">
              <div className="rounded-xl p-3" style={{ background: '#ffffff' }}>
                <QRCodeSVG
                  ref={qrRef}
                  value={url}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#20201F"
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-center text-xs" style={{ color: '#5C5C59' }}>
              Tus pacientes escanean el QR para agendar un turno
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
