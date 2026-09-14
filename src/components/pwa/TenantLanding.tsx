'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  Bell,
  Store,
  Tag,
  User,
  Share2,
  MapPin,
  Phone,
  QrCode,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

type Tenant = {
  id: string
  slug: string
  nombre: string
  rubro: string | null
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  logo_url: string | null
  imagen_portada_url: string | null
  color_marca: string | null
  color_secundario: string | null
  texto_bienvenida: string | null
  mensaje_bienvenida: string | null
}

function ActionButton({
  href,
  icon,
  label,
  sub,
  color,
  primary,
}: {
  href: string
  icon: React.ReactNode
  label: string
  sub?: string
  color: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] w-full"
      style={{
        background: primary ? color : '#2A2A29',
        border: `1px solid ${primary ? color : '#3D3D3B'}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: primary ? 'rgba(255,255,255,0.2)' : `${color}18`, color: primary ? '#fff' : color }}
      >
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold leading-none" style={{ color: primary ? '#fff' : '#F0F0EE' }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5 truncate" style={{ color: primary ? 'rgba(255,255,255,0.85)' : '#9A9A96' }}>
            {sub}
          </p>
        )}
      </div>
      <ChevronRight size={16} style={{ color: primary ? 'rgba(255,255,255,0.7)' : '#5C5C59' }} />
    </Link>
  )
}

export default function TenantLanding({ tenant, camp }: { tenant: Tenant; camp: string | null }) {
  const color = tenant.color_marca ?? '#7AB619'
  const secondary = tenant.color_secundario ?? '#3B82F6'
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (!('Notification' in window)) setNotifState('unsupported')
    else if (Notification.permission === 'granted') setNotifState('granted')
    else if (Notification.permission === 'denied') setNotifState('denied')
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: tenant.nombre, text: tenant.descripcion ?? '', url })
      } catch {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide" style={{ background: '#20201F' }}>
      {/* Cover */}
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        {tenant.imagen_portada_url ? (
          <img src={tenant.imagen_portada_url} alt="portada" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)` }}
          />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #20201F 0%, transparent 60%)' }} />
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <Sparkles size={12} style={{ color }} />
            {tenant.rubro ?? 'Empresa'}
          </div>
          <button onClick={handleShare} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <Share2 size={14} />
          </button>
        </div>
        {/* Logo + nombre overlapping */}
        <div className="absolute -bottom-8 left-4 right-4 flex items-end gap-3">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border-2"
            style={{ background: '#2A2A29', borderColor: '#3D3D3B', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          >
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Store size={22} style={{ color }} />
            )}
          </div>
          <div className="pb-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate" style={{ color: '#F0F0EE' }}>
              {tenant.nombre}
            </h1>
            {tenant.direccion && (
              <p className="text-xs flex items-center gap-1 truncate" style={{ color: '#9A9A96' }}>
                <MapPin size={10} /> {tenant.direccion}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 px-4 pb-6 space-y-4">
        {/* Bienvenida */}
        <div>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9A96' }}>
            {tenant.texto_bienvenida ?? tenant.mensaje_bienvenida ?? tenant.descripcion ?? `Bienvenido a ${tenant.nombre}. Elegí cómo querés comunicarte con nosotros.`}
          </p>
          {camp && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
              <QrCode size={12} /> Campaña: {camp}
            </p>
          )}
        </div>

        {/* Install banner */}
        {showInstall && (
          <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
              <Bell size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: '#F0F0EE' }}>Instalá la app</p>
              <p className="text-xs" style={{ color: '#5C5C59' }}>Acceso rápido desde tu inicio</p>
            </div>
            <button onClick={handleInstall} className="rounded-xl px-3 py-1.5 text-xs font-semibold flex-shrink-0" style={{ background: color, color: '#fff' }}>
              Instalar
            </button>
          </div>
        )}

        {/* Acciones principales */}
        <div className="space-y-2.5">
          <ActionButton href={`/c/${tenant.slug}/chat`} icon={<MessageCircle size={18} />} label="Hablar con nosotros" sub="Respuesta rápida por chat" color={color} primary />
          <div className="grid grid-cols-2 gap-2.5">
            <ActionButton href={`/c/${tenant.slug}/chat`} icon={<Bell size={18} />} label="Notificaciones" sub={notifState === 'granted' ? 'Activadas' : 'Activar'} color={color} />
            <ActionButton href={`/c/${tenant.slug}/chat`} icon={<User size={18} />} label="Mi cuenta" sub="Mis datos" color={color} />
          </div>
          <ActionButton href={`/c/${tenant.slug}/servicios`} icon={<Store size={18} />} label="Servicios" sub="Conocé lo que ofrecemos" color={color} />
          <ActionButton href={`/c/${tenant.slug}/promos`} icon={<Tag size={18} />} label="Promociones / Beneficios" sub="Ofertas exclusivas" color={color} />
        </div>

        {/* Contacto rápido */}
        {tenant.telefono && (
          <a href={`tel:${tenant.telefono}`} className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
            <Phone size={16} style={{ color }} />
            <span className="text-sm" style={{ color: '#F0F0EE' }}>{tenant.telefono}</span>
            <span className="ml-auto text-xs" style={{ color: '#5C5C59' }}>Llamar</span>
          </a>
        )}

        <p className="text-center text-[10px] pt-2" style={{ color: '#3D3D3B' }}>
          Powered by SimplificIA · <Link href="/" style={{ color: '#5C5C59' }}>simplificia.com.ar</Link>
        </p>
      </div>
    </div>
  )
}
