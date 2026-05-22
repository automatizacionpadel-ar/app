// src/app/admin/medicos/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Stethoscope, Users, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminMedicosPage() {
  const supabase = createClient()

  const { data: medicos } = await supabase
    .from('medicos')
    .select('id, nombre_completo, especialidad, activo, created_at, webhook_token')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0EE' }}>Médicos</h1>
          <p className="text-sm" style={{ color: '#5C5C59' }}>
            {medicos?.length ?? 0} médicos registrados en la plataforma
          </p>
        </div>
        <Link href="/admin/medicos/nuevo"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#7AB619', color: '#20201F' }}>
          <Plus size={16} />
          Nuevo médico
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>
        {!medicos || medicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Stethoscope size={40} style={{ color: '#3D3D3B' }} className="mb-3" />
            <p className="text-sm mb-4" style={{ color: '#5C5C59' }}>
              No hay médicos registrados
            </p>
            <Link href="/admin/medicos/nuevo"
              className="text-sm font-medium" style={{ color: '#7AB619' }}>
              Agregar el primero →
            </Link>
          </div>
        ) : (
          medicos.map(medico => (
            <div key={medico.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: '1px solid #3D3D3B' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(122,182,25,0.12)', color: '#7AB619' }}>
                <Stethoscope size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F0F0EE' }}>
                  {medico.nombre_completo}
                </p>
                <p className="text-xs" style={{ color: '#5C5C59' }}>
                  {medico.especialidad}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {medico.activo ? (
                  <span className="flex items-center gap-1 text-xs"
                    style={{ color: '#7AB619' }}>
                    <CheckCircle size={13} /> Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs"
                    style={{ color: '#EF4444' }}>
                    <XCircle size={13} /> Inactivo
                  </span>
                )}
                <code className="text-[10px] rounded px-2 py-1"
                  style={{ background: '#20201F', color: '#5C5C59' }}>
                  {medico.webhook_token.slice(0, 12)}...
                </code>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
