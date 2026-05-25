'use client'

import { useState, useCallback } from 'react'
import { X, Plus, Trash2, Send, FileText, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types'

interface NegocioInfo {
  id:                string
  nombre:            string
  rubro:             string
  logo_url:          string | null
  sello_url:         string | null
  firma_url:         string | null
  habilitar_recetas: boolean
}

interface Props {
  cliente:  Cliente
  negocio:  NegocioInfo
  onClose:  () => void
}

async function imgToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

async function generarPDF(
  negocio:      NegocioInfo,
  cliente:      Cliente,
  medicamentos: string[]
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, margin = 20

  // ── Colores
  const verde      = [122, 182, 25]  as [number,number,number]
  const oscuro     = [30,  30,  28]  as [number,number,number]
  const gris       = [92,  92,  89]  as [number,number,number]
  const grisClaro  = [220, 220, 218] as [number,number,number]

  // ── Encabezado con fondo verde
  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 38, 'F')

  // Logo del negocio (si existe)
  let cursorX = margin
  const logoB64 = negocio.logo_url ? await imgToBase64(negocio.logo_url) : null
  if (logoB64) {
    try { doc.addImage(logoB64, 'JPEG', margin, 6, 26, 26) } catch {}
    cursorX = margin + 32
  }

  // Nombre negocio y rubro en header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(negocio.nombre, cursorX, 17)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(negocio.rubro, cursorX, 24)

  // Título RECETA MÉDICA a la derecha
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('RECETA MÉDICA', W - margin, 22, { align: 'right' })

  // ── Datos de la receta
  let y = 50
  doc.setTextColor(...oscuro)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Fecha: ${fecha}`, margin, y)
  doc.text(`N° Receta: ${Date.now().toString().slice(-8)}`, W - margin, y, { align: 'right' })
  y += 8

  // ── Datos del cliente
  doc.setFillColor(...grisClaro)
  doc.roundedRect(margin, y, W - margin * 2, 22, 2, 2, 'F')
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...gris)
  doc.text('PACIENTE', margin + 4, y)
  y += 5
  doc.setTextColor(...oscuro)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const nombreCliente = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()
  doc.text(nombreCliente, margin + 4, y)
  if (cliente.celular) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gris)
    doc.text(cliente.celular, W - margin - 4, y, { align: 'right' })
  }
  y += 14

  // ── Línea separadora
  doc.setDrawColor(...verde)
  doc.setLineWidth(0.5)
  doc.line(margin, y, W - margin, y)
  y += 8

  // ── Indicaciones
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...verde)
  doc.text('Indicaciones médicas', margin, y)
  y += 8

  // ── Medicamentos
  medicamentos.forEach((med, i) => {
    if (!med.trim()) return

    // Check espacio disponible
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFillColor(248, 248, 247)
    doc.roundedRect(margin, y - 4, W - margin * 2, 11, 1.5, 1.5, 'F')

    // Número
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...verde)
    doc.text(`${i + 1}.`, margin + 3, y + 3)

    // Texto medicamento
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...oscuro)
    const lines = doc.splitTextToSize(med, W - margin * 2 - 14)
    doc.text(lines, margin + 10, y + 3)
    y += Math.max(12, lines.length * 6 + 4)
  })

  // ── Pie con sello y firma
  const pieY = 265
  doc.setDrawColor(...grisClaro)
  doc.setLineWidth(0.3)
  doc.line(margin, pieY, W - margin, pieY)

  // Sello
  const selB64 = negocio.sello_url ? await imgToBase64(negocio.sello_url) : null
  if (selB64) {
    try { doc.addImage(selB64, 'JPEG', margin, pieY + 4, 35, 22) } catch {}
  }

  // Firma
  const firB64 = negocio.firma_url ? await imgToBase64(negocio.firma_url) : null
  if (firB64) {
    try { doc.addImage(firB64, 'JPEG', W - margin - 50, pieY + 2, 50, 24) } catch {}
  }

  // Línea firma
  doc.setDrawColor(...gris)
  doc.setLineWidth(0.2)
  doc.line(W - margin - 55, pieY + 28, W - margin, pieY + 28)
  doc.setFontSize(8)
  doc.setTextColor(...gris)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma del profesional', W - margin - 28, pieY + 32, { align: 'center' })
  doc.text(negocio.nombre, W - margin - 28, pieY + 37, { align: 'center' })

  return doc.output('blob')
}

export default function RecetaModal({ cliente, negocio, onClose }: Props) {
  const [medicamentos, setMedicamentos] = useState<string[]>([''])
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const nombreCliente = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()

  function agregarLinea() {
    setMedicamentos(prev => [...prev, ''])
  }

  function actualizarLinea(i: number, val: string) {
    setMedicamentos(prev => prev.map((m, idx) => idx === i ? val : m))
  }

  function eliminarLinea(i: number) {
    setMedicamentos(prev => prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i))
  }

  const enviar = useCallback(async () => {
    const meds = medicamentos.filter(m => m.trim())
    if (!meds.length) { setErrorMsg('Agregá al menos un medicamento.'); return }
    setEstado('loading')
    setErrorMsg('')

    try {
      const supabase = createClient()

      // Generar PDF
      const blob = await generarPDF(negocio, cliente, meds)

      // Subir a Storage
      const recetaId = crypto.randomUUID()
      const path = `${negocio.id}/${recetaId}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('recetas')
        .upload(path, blob, { contentType: 'application/pdf', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('recetas').getPublicUrl(path)

      // Crear receta y enviar push
      const res = await fetch('/api/recetas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, medicamentos: meds, pdf_url: publicUrl }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al enviar')
      }

      setEstado('ok')
    } catch (err: any) {
      setEstado('error')
      setErrorMsg(err.message ?? 'Error al generar la receta')
    }
  }, [negocio, cliente, medicamentos])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-xl animate-fade-up"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #3D3D3B' }}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <FileText size={16} style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Nueva receta</p>
              <p className="text-xs" style={{ color: '#5C5C59' }}>{nombreCliente}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#5C5C59' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F0F0EE')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
            <X size={16} />
          </button>
        </div>

        {estado === 'ok' ? (
          <div className="flex flex-col items-center gap-3 py-10 px-5">
            <CheckCircle size={40} style={{ color: '#7AB619' }} />
            <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>Receta enviada</p>
            <p className="text-xs text-center" style={{ color: '#5C5C59' }}>
              {nombreCliente} recibirá una notificación push con el PDF de la receta.
            </p>
            <button onClick={onClose}
              className="mt-2 rounded-lg px-5 py-2 text-sm font-medium"
              style={{ background: '#3D3D3B', color: '#F0F0EE' }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">

            <p className="text-xs font-medium" style={{ color: '#9A9A96' }}>
              MEDICAMENTOS
            </p>

            <div className="flex flex-col gap-2">
              {medicamentos.map((med, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-5 text-right flex-shrink-0"
                    style={{ color: '#5C5C59' }}>{i + 1}.</span>
                  <input
                    value={med}
                    onChange={e => actualizarLinea(i, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLinea() } }}
                    placeholder="Ej: Ibuprofeno 400mg - 1 comprimido cada 8h"
                    className="flex-1 rounded-lg px-3 py-2 text-sm"
                    style={{ background: '#20201F', border: '1px solid #3D3D3B', color: '#F0F0EE', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#8B5CF6')}
                    onBlur={e  => (e.currentTarget.style.borderColor = '#3D3D3B')}
                    autoFocus={i === medicamentos.length - 1 && i > 0}
                  />
                  <button onClick={() => eliminarLinea(i)}
                    className="p-1.5 rounded-md transition-colors flex-shrink-0"
                    style={{ color: '#5C5C59' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={agregarLinea}
              className="flex items-center gap-1.5 text-xs transition-colors self-start"
              style={{ color: '#5C5C59' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7AB619')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5C5C59')}>
              <Plus size={13} /> Agregar medicamento
            </button>

            {errorMsg && (
              <p className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {errorMsg}
              </p>
            )}

            {!cliente.push_activo && (
              <p className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                Este cliente no tiene notificaciones push activas. Podrás enviar la receta pero no recibirá una notificación.
              </p>
            )}

            <button onClick={enviar} disabled={estado === 'loading'}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: '#8B5CF6', color: '#fff' }}>
              {estado === 'loading' ? (
                <span className="animate-pulse">Generando PDF...</span>
              ) : (
                <><Send size={15} /> Enviar receta</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
