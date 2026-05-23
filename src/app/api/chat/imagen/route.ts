// src/app/api/chat/imagen/route.ts
// Recibe un archivo de imagen, lo sube a Supabase Storage y retorna la URL pública

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'chat-imagenes'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('imagen') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 10MB' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Crear bucket si no existe
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const path     = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
