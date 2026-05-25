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

  const [{ data: usuario }, { data: negocio }] = await Promise.all([
    supabase.from('usuarios').select('rol').eq('id', user.id).single(),
    supabase.from('negocios').select('id, slug, nombre').eq('usuario_id', user.id).single(),
  ])

  if (!usuario) redirect('/login')

  return { user, supabase, rol: usuario.rol, negocio }
})
