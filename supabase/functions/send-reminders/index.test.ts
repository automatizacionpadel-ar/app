/// <reference lib="deno.ns" />
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts"
import {
  renderTemplate,
  getReminderField,
  formatTime,
  formatDate,
  buildPayload,
} from "./helpers.ts"

Deno.test("renderTemplate: reemplaza variables conocidas", () => {
  const result = renderTemplate(
    "Hola {nombre}, tu cita de {especialidad} es el {fecha} a las {hora}.",
    { nombre: "Juan", especialidad: "Clínica", fecha: "15/06", hora: "10:00" }
  )
  assertEquals(result, "Hola Juan, tu cita de Clínica es el 15/06 a las 10:00.")
})

Deno.test("renderTemplate: preserva variables desconocidas sin romper", () => {
  const result = renderTemplate("Hola {nombre} {apellido}", { nombre: "Ana" })
  assertEquals(result, "Hola Ana {apellido}")
})

Deno.test("renderTemplate: maneja template sin variables", () => {
  const result = renderTemplate("Recordá tu cita.", {})
  assertEquals(result, "Recordá tu cita.")
})

Deno.test("getReminderField: retorna campo correcto para 24h", () => {
  assertEquals(getReminderField(24), "recordatorio_24h_enviado")
})

Deno.test("getReminderField: retorna campo correcto para 2h", () => {
  assertEquals(getReminderField(2), "recordatorio_2h_enviado")
})

Deno.test("getReminderField: lanza error para valor no soportado", () => {
  assertThrows(
    () => getReminderField(12),
    Error,
    "hours_before no soportado: 12"
  )
})

Deno.test("formatTime: formatea hora en timezone Argentina", () => {
  // 2026-06-15T13:00:00Z = 10:00 AM Argentina (UTC-3)
  const result = formatTime("2026-06-15T13:00:00Z")
  assertEquals(result, "10:00")
})

Deno.test("formatDate: formatea fecha en formato dd/MM", () => {
  const result = formatDate("2026-06-15T13:00:00Z")
  assertEquals(result, "15/06")
})

Deno.test("buildPayload: construye JSON con estructura correcta", () => {
  const payload = JSON.parse(buildPayload("Tu cita es mañana", "cita-123"))
  assertEquals(payload.title, "Recordatorio de cita")
  assertEquals(payload.body, "Tu cita es mañana")
  assertEquals(payload.data.tag, "recordatorio")
  assertEquals(payload.data.cita_id, "cita-123")
  assertEquals(payload.icon, "/logo.png")
})
