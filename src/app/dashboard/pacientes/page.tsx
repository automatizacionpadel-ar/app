// src/app/dashboard/pacientes/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PacientesCliente from './PacientesCliente'

export default async function PacientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  let medicoId: string | null = null
  let medicoInfo: { id: string; nombre: string; especialidad: string; logo_url: string | null; sello_url: string | null; firma_url: string | null } | null = null

  if (usuario.rol === 'medico') {
    const { data: medico } = await supabase
      .from('medicos')
      .select('id, nombre_completo, especialidad, logo_url, sello_url, firma_url')
      .eq('usuario_id', user.id)
      .single()
    if (medico) {
      medicoId = medico.id
      medicoInfo = {
        id:           medico.id,
        nombre:       medico.nombre_completo,
        especialidad: medico.especialidad,
        logo_url:     medico.logo_url,
        sello_url:    medico.sello_url,
        firma_url:    medico.firma_url,
      }
    }
  }

  const query = supabase
    .from('pacientes')
    .select('*, citas(count)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (medicoId) query.eq('medico_id', medicoId)

  const { data: pacientes } = await query

  return <PacientesCliente pacientesIniciales={pacientes ?? []} medicoId={medicoId} medicoInfo={medicoInfo} />
}
