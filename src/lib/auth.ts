// src/lib/auth.ts
// Helpers cacheados para evitar round-trips duplicados en Server Components.
// React.cache() deduplicates calls within the same request render tree.
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getAuthSession = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolver negocio via membresía (nuevo) con fallback legacy
  let negocio: any = null
  const [{ data: usuario }, { data: miembro }] = await Promise.all([
    supabase.from('usuarios').select('rol').eq('id', user.id).single(),
    supabase.from('negocio_miembros').select('negocio_id').eq('usuario_id', user.id).maybeSingle(),
  ])
  if ((miembro as any)?.negocio_id) {
    const { data } = await supabase.from('negocios').select('id, slug, nombre').eq('id', (miembro as any).negocio_id).single()
    negocio = data
  } else {
    const { data } = await supabase.from('negocios').select('id, slug, nombre').eq('usuario_id', user.id).maybeSingle()
    negocio = data
  }

  if (!usuario) redirect('/login')

  return { user, supabase, rol: usuario.rol, negocio }
})
