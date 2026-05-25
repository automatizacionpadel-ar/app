// src/app/admin/negocios/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import { NegocioRow } from './NegocioRow'

export default async function AdminNegociosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: negocios } = await supabase
    .from('negocios')
    .select('id, nombre, rubro, activo, habilitar_recetas, created_at, webhook_token')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Negocios</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            {negocios?.length ?? 0} negocios registrados en la plataforma
          </p>
        </div>
        <Link href="/admin/negocios/nuevo"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <Plus size={16} />
          Nuevo negocio
        </Link>
      </div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        {!negocios || negocios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Briefcase size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm mb-4" style={{ color: '#5C5C59' }}>No hay negocios registrados</p>
            <Link href="/admin/negocios/nuevo" className="text-sm font-medium" style={{ color: '#7AB619' }}>
              Agregar el primero →
            </Link>
          </div>
        ) : (
          negocios.map(negocio => <NegocioRow key={negocio.id} negocio={negocio} />)
        )}
      </div>
    </div>
  )
}
