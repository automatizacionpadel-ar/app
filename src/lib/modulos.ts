// src/lib/modulos.ts — Registry de módulos SaaS
// Cada módulo puede declarar dependencias, flag de plan y ruta

export type ModuloId =
  | 'chat'
  | 'qr'
  | 'etiquetas'
  | 'campanias'
  | 'servicios'
  | 'pedidos'
  | 'fidelizacion'
  | 'reservas'
  | 'webhooks'

export interface ModuloDef {
  id: ModuloId
  nombre: string
  descripcion: string
  icono: string
  ruta: string
  flag: string // columna en negocios o key en planes.features
  beta?: boolean
}

export const MODULOS: ModuloDef[] = [
  { id: 'chat', nombre: 'Chat', descripcion: 'Mensajería cliente ↔ empresa', icono: 'MessageSquare', ruta: '/dashboard/mensajeria', flag: 'chat' },
  { id: 'qr', nombre: 'QR / NFC', descripcion: 'Códigos por campaña', icono: 'QrCode', ruta: '/dashboard/qr', flag: 'qr' },
  { id: 'etiquetas', nombre: 'Etiquetas', descripcion: 'Segmentación', icono: 'Tag', ruta: '/dashboard/etiquetas', flag: 'etiquetas' },
  { id: 'campanias', nombre: 'Campañas', descripcion: 'Push masivos', icono: 'Megaphone', ruta: '/dashboard/campanias', flag: 'campanias' },
  { id: 'servicios', nombre: 'Servicios', descripcion: 'Catálogo', icono: 'Store', ruta: '/dashboard/servicios', flag: 'servicios' },
  { id: 'pedidos', nombre: 'Pedidos', descripcion: 'Pedidos y presupuestos', icono: 'ShoppingBag', ruta: '/dashboard/pedidos', flag: 'pedidos', beta: true },
  { id: 'fidelizacion', nombre: 'Fidelización', descripcion: 'Puntos y cupones', icono: 'Star', ruta: '/dashboard/fidelizacion', flag: 'fidelizacion', beta: true },
  { id: 'reservas', nombre: 'Reservas', descripcion: 'Turnos y calendario', icono: 'Calendar', ruta: '/dashboard/calendario', flag: 'reservas' },
  { id: 'webhooks', nombre: 'Webhooks', descripcion: 'Automatizaciones n8n', icono: 'Webhook', ruta: '/dashboard/webhooks', flag: 'webhooks' },
]

export function isModuloHabilitado(negocio: any, moduloId: ModuloId): boolean {
  // Por ahora todos habilitados excepto beta que requieren opt-in explícito
  // A futuro chequear planes.features[moduloId] y negocio.modulos_habilitados
  const mod = MODULOS.find(m => m.id === moduloId)
  if (!mod) return false
  if (negocio?.modulos_habilitados && Array.isArray(negocio.modulos_habilitados)) {
    return negocio.modulos_habilitados.includes(moduloId)
  }
  // default: habilitados salvo beta si no está en lista
  if (mod.beta && negocio?.modulos_habilitados === null) return false
  return true
}
