// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()

  // Solo superadmin puede acceder al panel admin
  if (!usuario || usuario.rol !== 'superadmin') redirect('/dashboard')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol="superadmin" nombreNegocio="Super Admin" />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
