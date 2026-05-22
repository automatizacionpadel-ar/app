import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import {
  buildPayload,
  formatDate,
  formatTime,
  getReminderField,
  renderTemplate,
} from "./helpers.ts"

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let hours_before: number
  try {
    const body = await req.json()
    hours_before = body.hours_before
  } catch {
    return json({ error: "Body JSON inválido" }, 400)
  }

  if (hours_before !== 24 && hours_before !== 2) {
    return json({ error: "hours_before debe ser 24 o 2" }, 400)
  }

  webpush.setVapidDetails(
    Deno.env.get("VAPID_EMAIL")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  )

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const reminderField = getReminderField(hours_before)
  const now = new Date()
  const windowStart = new Date(
    now.getTime() + (hours_before * 60 - 30) * 60 * 1000
  ).toISOString()
  const windowEnd = new Date(
    now.getTime() + (hours_before * 60 + 30) * 60 * 1000
  ).toISOString()

  const { data: citas, error: citasError } = await supabase
    .from("citas")
    .select(`
      id,
      medico_id,
      paciente_id,
      fecha_inicio,
      pacientes!inner ( id, nombre, push_activo ),
      medicos!inner ( especialidad, medico_agente_config ( mensaje_recordatorio ) )
    `)
    .gte("fecha_inicio", windowStart)
    .lte("fecha_inicio", windowEnd)
    .in("estado", ["pendiente", "confirmada"])
    .eq(reminderField, false)
    .limit(50)

  if (citasError) {
    console.error("Error consultando citas:", citasError)
    return json({ error: "Error consultando citas" }, 500)
  }

  const citasConPush = (citas ?? []).filter(
    (c: any) => c.pacientes?.push_activo === true
  )

  let procesadas = 0
  let enviadas = 0
  let fallidas = 0

  for (const cita of citasConPush) {
    const template =
      cita.medicos?.medico_agente_config?.mensaje_recordatorio ??
      "Recordá tu cita de {especialidad} el {fecha} a las {hora}, {nombre}."

    const messageBody = renderTemplate(template, {
      nombre: cita.pacientes.nombre,
      hora: formatTime(cita.fecha_inicio),
      fecha: formatDate(cita.fecha_inicio),
      especialidad: cita.medicos.especialidad,
    })

    const payload = buildPayload(messageBody, cita.id)

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("paciente_id", cita.paciente_id)
      .eq("activo", true)

    if (!subscriptions || subscriptions.length === 0) {
      procesadas++
      continue
    }

    const resultados = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(sub.subscription, payload)
      )
    )

    const expiradas: string[] = []
    resultados.forEach((result, i) => {
      if (result.status === "fulfilled") {
        enviadas++
      } else {
        fallidas++
        const status = (result.reason as any)?.statusCode
        if (status === 410 || status === 404) expiradas.push(subscriptions[i].id)
      }
    })

    if (expiradas.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ activo: false })
        .in("id", expiradas)
    }

    await supabase
      .from("citas")
      .update({ [reminderField]: true })
      .eq("id", cita.id)

    await supabase.from("notificaciones_log").insert(
      subscriptions.map((sub: any, i: number) => ({
        medico_id: cita.medico_id,
        paciente_id: cita.paciente_id,
        push_subscription_id: sub.id,
        cita_id: cita.id,
        tipo: "recordatorio",
        titulo: "Recordatorio de cita",
        cuerpo: messageBody,
        exitoso: resultados[i].status === "fulfilled",
        error_mensaje:
          resultados[i].status === "rejected"
            ? String((resultados[i] as PromiseRejectedResult).reason)
            : null,
      }))
    )

    procesadas++
  }

  return json({ procesadas, enviadas, fallidas })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
