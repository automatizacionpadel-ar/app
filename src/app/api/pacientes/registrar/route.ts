// Legacy alias — n8n workflow still calls /api/pacientes/registrar
// Forwards to /api/clientes/registrar without breaking the workflow
import { NextRequest } from 'next/server'
import { POST as registrarCliente } from '@/app/api/clientes/registrar/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return registrarCliente(req)
}
