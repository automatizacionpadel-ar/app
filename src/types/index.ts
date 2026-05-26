// src/types/index.ts

export type Rol = 'superadmin' | 'negocio'

export type EstadoCita  = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
export type MetodoPago  = 'mercadopago' | 'transferencia' | 'efectivo' | 'sin_pago'
export type EstadoPago  = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado'

// ─── Negocio ──────────────────────────────────────────────────────────────────

export interface HorarioDia {
  inicio: string   // "09:00"
  fin:    string   // "18:00"
  activo: boolean
}

export interface Horarios {
  lunes:     HorarioDia
  martes:    HorarioDia
  miercoles: HorarioDia
  jueves:    HorarioDia
  viernes:   HorarioDia
  sabado:    HorarioDia
  domingo:   HorarioDia
}

export interface Negocio {
  id:                   string
  usuario_id:           string
  slug:                 string | null
  nombre:               string
  rubro:                string
  telefono:             string | null
  email:                string | null
  direccion:            string | null
  descripcion:          string | null
  duracion_cita_min:    number
  horarios:             Horarios | null
  dias_anticipacion:    number
  requiere_sena:        boolean
  monto_sena:           number | null
  alias_mp:             string | null
  cbu:                  string | null
  titular_cuenta:       string | null
  mp_access_token:      string | null
  webhook_token:        string
  foto_perfil_url:      string | null
  logo_url:             string | null
  sello_url:            string | null
  firma_url:            string | null
  nombre_negocio:       string | null
  color_marca:          string | null
  precio_consulta:      number | null
  acepta_agendamientos: boolean
  habilitar_recetas:    boolean
  activo:               boolean
  created_at:           string
  updated_at:           string
}

export interface NegocioAgenteConfig {
  id:                   string
  negocio_id:           string
  prompt_personalidad:  string
  tono:                 string
  idioma:               string
  mensaje_bienvenida:   string
  mensaje_confirmacion: string
  mensaje_recordatorio: string
  mensaje_cancelacion:  string
  created_at:           string
  updated_at:           string
}

export interface NegocioFaq {
  id:         string
  negocio_id: string
  pregunta:   string
  respuesta:  string
  orden:      number
  activo:     boolean
  created_at: string
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export interface Cliente {
  id:             string
  negocio_id:     string
  nombre:         string
  apellido:       string | null
  celular:        string | null
  email:          string | null
  push_activo:    boolean
  notas:          string | null
  total_citas:    number
  ultima_cita_at: string | null
  created_at:     string
  updated_at:     string
}

// ─── Cita ─────────────────────────────────────────────────────────────────────

export interface Cita {
  id:                         string
  negocio_id:                 string
  cliente_id:                 string
  fecha_inicio:               string
  fecha_fin:                  string
  estado:                     EstadoCita
  motivo:                     string | null
  notas:                      string | null
  metodo_pago:                MetodoPago
  estado_pago:                EstadoPago
  monto_sena:                 number | null
  mp_preference_id:           string | null
  mp_payment_id:              string | null
  external_reference:         string | null
  comprobante_url:            string | null
  recordatorio_24h_enviado:   boolean
  recordatorio_2h_enviado:    boolean
  origen:                     string
  created_at:                 string
  updated_at:                 string
  clientes?:                  Cliente
}

export interface CitaConCliente extends Cita {
  clientes: Cliente
}

// ─── Push ─────────────────────────────────────────────────────────────────────

export interface PushSubscription {
  id:           string
  cliente_id:   string
  negocio_id:   string
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth:   string
    }
  }
  user_agent:   string | null
  dispositivo:  string | null
  activo:       boolean
  created_at:   string
  last_used_at: string | null
}

// ─── Recetas ──────────────────────────────────────────────────────────────────

export interface Receta {
  id:           string
  negocio_id:   string
  cliente_id:   string
  medicamentos: string[]
  pdf_url:      string | null
  created_at:   string
}

// ─── Suscripciones ────────────────────────────────────────────────────────────

export interface Suscripcion {
  id:             string
  negocio_id:     string
  monto:          number
  fecha_pago:     string
  periodo_inicio: string
  periodo_fin:    string
  estado:         'pagado' | 'pendiente' | 'vencido'
  notas:          string | null
  created_at:     string
}

// ─── Campañas ─────────────────────────────────────────────────────────────────

export interface MensajePromo {
  id:             string
  negocio_id:     string
  titulo:         string
  contenido:      string
  segmento:       'todos' | 'inactivos_30d' | 'inactivos_60d'
  total_enviados: number
  total_fallidos: number
  enviado_at:     string | null
  borrador:       boolean
  created_at:     string
}

// ─── Formularios ──────────────────────────────────────────────────────────────

export interface FormNegocioNuevo {
  nombre:            string
  rubro:             string
  telefono:          string
  email:             string
  direccion:         string
  descripcion:       string
  duracion_cita_min: number
  dias_anticipacion: number
  horarios:          Horarios
  requiere_sena:     boolean
  monto_sena:        number | null
  alias_mp:          string
  cbu:               string
  titular_cuenta:    string
  mp_access_token:   string
  prompt_personalidad:  string
  tono:                 string
  mensaje_bienvenida:   string
  mensaje_confirmacion: string
  mensaje_recordatorio: string
  mensaje_cancelacion:  string
  faqs: Array<{ pregunta: string; respuesta: string; orden: number }>
  email_acceso:    string
  password_acceso: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface StatCard {
  titulo:    string
  valor:     string | number
  subtitulo: string
  icono:     string
  tendencia?: {
    valor:    number
    positivo: boolean
  }
}

export interface NavItem {
  label:        string
  href:         string
  icon:         string
  badge?:       number
  adminOnly?:   boolean
  clienteOnly?: boolean
}
