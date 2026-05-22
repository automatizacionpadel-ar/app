export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export function getReminderField(
  hoursBefore: number
): "recordatorio_24h_enviado" | "recordatorio_2h_enviado" {
  if (hoursBefore === 24) return "recordatorio_24h_enviado"
  if (hoursBefore === 2) return "recordatorio_2h_enviado"
  throw new Error(`hours_before no soportado: ${hoursBefore}`)
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  // Crear formatter con options que fuerzan 2-digit
  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  })
  const parts = formatter.formatToParts(date)
  let day = parts.find(p => p.type === "day")?.value || "01"
  let month = parts.find(p => p.type === "month")?.value || "01"
  // Asegurar padding a 2 dígitos
  day = day.padStart(2, "0")
  month = month.padStart(2, "0")
  return `${day}/${month}`
}

export function buildPayload(messageBody: string, citaId: string): string {
  return JSON.stringify({
    title: "Recordatorio de cita",
    body: messageBody,
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      tag: "recordatorio",
      cita_id: citaId,
    },
  })
}
