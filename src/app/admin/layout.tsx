// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()

  if (!usuario || usuario.rol !== 'superadmin') redirect('/dashboard')

  return (
    <DashboardShell rol="superadmin" nombreNegocio="Super Admin">
      {children}
    </DashboardShell>
  )
}
