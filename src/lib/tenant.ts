// src/lib/tenant.ts
// Helpers para resolver tenant por slug y verificar membership.

import { createClient, createAdminClient } from '@/lib/supabase/server'

export type TenantBranding = {
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
  ocultar_marca_plataforma: boolean
  activo: boolean
  mensaje_bienvenida: string | null
}

/**
 * Resolución pública por slug (anon-safe, usa service_role internamente).
 * Se usa en landing PWA y en /api/negocios/publico.
 */
export async function getTenantBySlug(slug: string): Promise<TenantBranding | null> {
  const supabase = createAdminClient()
  const { data: negocio } = await supabase
    .from('negocios')
    .select(`
      id, slug, nombre, rubro, descripcion, direccion, telefono,
      logo_url, imagen_portada_url, color_marca, color_secundario,
      texto_bienvenida, ocultar_marca_plataforma, activo,
      negocio_agente_config ( mensaje_bienvenida )
    `)
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  if (!negocio) return null
  const cfg = (negocio.negocio_agente_config as any[])?.[0]
  return {
    id: negocio.id,
    slug: negocio.slug,
    nombre: negocio.nombre,
    rubro: negocio.rubro,
    descripcion: (negocio as any).descripcion ?? null,
    direccion: negocio.direccion,
    telefono: negocio.telefono,
    logo_url: negocio.logo_url ?? null,
    imagen_portada_url: (negocio as any).imagen_portada_url ?? null,
    color_marca: negocio.color_marca ?? '#7AB619',
    color_secundario: (negocio as any).color_secundario ?? null,
    texto_bienvenida: (negocio as any).texto_bienvenida ?? null,
    ocultar_marca_plataforma: (negocio as any).ocultar_marca_plataforma ?? false,
    activo: (negocio as any).activo ?? true,
    mensaje_bienvenida: cfg?.mensaje_bienvenida ?? null,
  }
}

/**
 * Tenant IDs del usuario autenticado (usa RLS helper auth_negocio_ids).
 * Retorna negocio_ids donde el usuario es miembro o owner legacy.
 */
export async function getTenantIdsForCurrentUser(): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Preferir negocio_miembros
  const { data: miembros } = await supabase
    .from('negocio_miembros')
    .select('negocio_id')
    .eq('usuario_id', user.id)

  const ids = new Set<string>((miembros ?? []).map((m: any) => m.negocio_id))

  // Fallback legacy: negocios.usuario_id
  const { data: owned } = await supabase
    .from('negocios')
    .select('id')
    .eq('usuario_id', user.id)

  for (const n of owned ?? []) ids.add((n as any).id)

  return Array.from(ids)
}

/**
 * Verifica que el usuario actual pertenece al tenant dado.
 * Lanza redirect si no pertenece (usar en Server Components).
 */
export async function assertTenantMembership(negocioId: string): Promise<boolean> {
  const ids = await getTenantIdsForCurrentUser()
  // superadmin bypasa
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if ((usuario as any)?.rol === 'superadmin') return true
  return ids.includes(negocioId)
}
