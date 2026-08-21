// Genera un enlace que abre WhatsApp con el mensaje prellenado.
// El usuario hace clic y lo envía con un tap — sin API key, sin costo.
export function waLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "")
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`
}

// Normaliza un número mexicano a formato WhatsApp: 52 + 10 dígitos locales.
// Acepta lo que sea que escriba el cliente y evita duplicar la lada:
//   "667 123 4567", "+52 667 123 4567", "52 667...", "044 667...", "+521 667..."
// todos terminan como "526671234567".
export function normalizarTelMx(input: string): string {
  let d = (input ?? "").replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)                              // salida internacional (00…)
  if (d.startsWith("044") || d.startsWith("045")) d = d.slice(3)      // celular nacional (formato viejo)
  if (d.length > 10 && d.startsWith("521")) d = d.slice(3)            // lada país + '1' de móvil
  else if (d.length > 10 && d.startsWith("52")) d = d.slice(2)        // lada país
  if (d.length > 10) d = d.slice(-10)                                 // por seguridad, últimos 10
  return "52" + d
}

// ─── Plantillas de mensajes ───────────────────────────────────────────────────

export function msgClienteRecibido(params: {
  folio: number
  servicio: string
  tiempo: string
}) {
  return (
    `✅ *Despacho Contable Rodríguez*\n\n` +
    `Hola, recibimos tu solicitud:\n` +
    `📋 *${params.servicio}*\n` +
    `Folio: *#${String(params.folio).padStart(4, "0")}*\n\n` +
    `Tiempo estimado de atención: *${params.tiempo}*\n\n` +
    `Te avisaremos cuando esté lista. ¡Gracias por tu confianza!`
  )
}

export function msgTrabajadorAsignado(params: {
  nombre: string
  folio: number
  cliente: string
  servicio: string
  nivel: string
  notas?: string
}) {
  return (
    `📌 *Nueva solicitud asignada*\n\n` +
    `Hola *${params.nombre}*, Saúl te asignó:\n\n` +
    `Cliente: *${params.cliente}*\n` +
    `Servicio: *${params.servicio}*\n` +
    `Nivel: ${params.nivel}\n` +
    `Folio: *#${String(params.folio).padStart(4, "0")}*\n` +
    (params.notas ? `\nNotas: ${params.notas}\n` : "") +
    `\nCuando termines, avisa a Saúl para cerrar la solicitud.`
  )
}

export function msgClienteListo(params: {
  folio: number
  servicio: string
}) {
  return (
    `🎉 *Despacho Contable Rodríguez*\n\n` +
    `Tu solicitud está *lista*:\n` +
    `📋 *${params.servicio}*\n` +
    `Folio: *#${String(params.folio).padStart(4, "0")}*\n\n` +
    `Comunícate con nosotros para recoger o recibir tus documentos.\n` +
    `¡Gracias!`
  )
}
