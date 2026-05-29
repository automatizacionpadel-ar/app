// src/app/dashboard/layout.tsx
import { getAuthSession } from '@/lib/auth'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { rol, negocio, user } = await getAuthSession()

  const nombreNegocio = rol === 'negocio'
    ? (negocio?.nombre ?? user.email ?? '')
    : 'Super Admin'

  return (
    <DashboardShell rol={rol} nombreNegocio={nombreNegocio}>
      {children}
    </DashboardShell>
  )
}
