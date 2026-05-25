// src/app/api/sesion/cliente/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const chat_id = req.nextUrl.searchParams.get('chat_id')
  if (!chat_id) return NextResponse.json({ cliente_id: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('chat_sessions')
    .select('cliente_id')
    .eq('chat_id', chat_id)
    .single()

  return NextResponse.json({ cliente_id: data?.cliente_id ?? null })
}
