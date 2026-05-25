// src/app/dashboard/layout.tsx
import { getAuthSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { rol, negocio, user } = await getAuthSession()

  const nombreNegocio = rol === 'negocio'
    ? (negocio?.nombre ?? user.email ?? '')
    : 'Super Admin'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={rol} nombreNegocio={nombreNegocio} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
