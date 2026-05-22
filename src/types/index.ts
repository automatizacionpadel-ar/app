// src/types/index.ts

export type Rol = 'superadmin' | 'medico'

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
export type MetodoPago = 'mercadopago' | 'transferencia' | 'efectivo' | 'sin_pago'
export type EstadoPago = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado'

// ─── Médico ───────────────────────────────────────────────────────────────────

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

export interface Medico {
  id:                 string
  usuario_id:         string
  nombre_completo:    string
  especialidad:       string
  telefono:           string | null
  email:              string | null
  direccion:          string | null
  descripcion:        string | null
  duracion_cita_min:  number
  horarios:           Horarios | null
  dias_anticipacion:  number
  requiere_sena:      boolean
  monto_sena:         number | null
  alias_mp:           string | null
  cbu:                string | null
  titular_cuenta:     string | null
  mp_access_token:    string | null
  webhook_token:      string
  activo:             boolean
  created_at:         string
  updated_at:         string
}

export interface MedicoAgenteConfig {
  id:                   string
  medico_id:            string
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

export interface MedicoFaq {
  id:         string
  medico_id:  string
  pregunta:   string
  respuesta:  string
  orden:      number
  activo:     boolean
  created_at: string
}

// ─── Paciente ─────────────────────────────────────────────────────────────────

export interface Paciente {
  id:             string
  medico_id:      string
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
  medico_id:                  string
  paciente_id:                string
  fecha_inicio:               string
  fecha_fin:                  string
  estado:                     EstadoCita
  motivo_consulta:            string | null
  notas_medico:               string | null
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
  // Join con paciente (cuando se hace select con FK)
  pacientes?:                 Paciente
}

// Cita con datos del paciente expandidos (para el calendario y listas)
export interface CitaConPaciente extends Cita {
  pacientes: Paciente
}

// ─── Push ─────────────────────────────────────────────────────────────────────

export interface PushSubscription {
  id:           string
  paciente_id:  string
  medico_id:    string
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

// ─── Campañas ─────────────────────────────────────────────────────────────────

export interface MensajePromo {
  id:             string
  medico_id:      string
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

export interface FormMedicoNuevo {
  // Datos básicos
  nombre_completo:   string
  especialidad:      string
  telefono:          string
  email:             string
  direccion:         string
  descripcion:       string
  duracion_cita_min: number
  dias_anticipacion: number
  // Horarios
  horarios: Horarios
  // Pagos
  requiere_sena:   boolean
  monto_sena:      number | null
  alias_mp:        string
  cbu:             string
  titular_cuenta:  string
  mp_access_token: string
  // Agente IA
  prompt_personalidad:  string
  tono:                 string
  mensaje_bienvenida:   string
  mensaje_confirmacion: string
  mensaje_recordatorio: string
  mensaje_cancelacion:  string
  // FAQs
  faqs: Array<{ pregunta: string; respuesta: string; orden: number }>
  // Credenciales de acceso
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
    valor:     number
    positivo:  boolean
  }
}

export interface NavItem {
  label:  string
  href:   string
  icon:   string
  badge?: number
}
