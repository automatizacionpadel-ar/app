import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const chat_id = req.nextUrl.searchParams.get('chat_id')
  if (!chat_id) return NextResponse.json({ paciente_id: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('chat_sessions')
    .select('paciente_id')
    .eq('chat_id', chat_id)
    .single()

  return NextResponse.json({ paciente_id: data?.paciente_id ?? null })
}
