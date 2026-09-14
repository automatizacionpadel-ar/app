'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type MensajeRow = {
  id: string
  negocio_id: string
  cliente_id: string | null
  chat_id: string
  role: string
  content: string
  image_url: string | null
  created_at: string
}

export function useRealtimeChat({
  negocioId,
  chatId,
  enabled,
  onNewMessage,
}: {
  negocioId: string | null
  chatId: string | null
  enabled: boolean
  onNewMessage: (msg: MensajeRow) => void
}) {
  const cbRef = useRef(onNewMessage)
  cbRef.current = onNewMessage

  useEffect(() => {
    if (!enabled || !negocioId || !chatId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`chat:${negocioId}:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as MensajeRow
          // Doble chequeo negocio_id por seguridad
          if (row.negocio_id !== negocioId) return
          cbRef.current(row)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, negocioId, chatId])
}
