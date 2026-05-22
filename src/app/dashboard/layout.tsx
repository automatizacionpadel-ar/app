// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener rol y datos del médico
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  let nombreMedico = user.email ?? ''

  if (usuario.rol === 'medico') {
    const { data: medico } = await supabase
      .from('medicos')
      .select('nombre_completo')
      .eq('usuario_id', user.id)
      .single()

    if (medico) nombreMedico = medico.nombre_completo
  } else {
    nombreMedico = 'Super Admin'
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={usuario.rol} nombreMedico={nombreMedico} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
