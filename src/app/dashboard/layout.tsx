// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let nombreNegocio = user.email ?? ''

  if (usuario.rol === 'negocio') {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('nombre')
      .eq('usuario_id', user.id)
      .single()
    if (negocio) nombreNegocio = negocio.nombre
  } else {
    nombreNegocio = 'Super Admin'
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={usuario.rol} nombreNegocio={nombreNegocio} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
