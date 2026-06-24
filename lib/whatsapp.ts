// Genera un enlace que abre WhatsApp con el mensaje prellenado.
// El usuario hace clic y lo envía con un tap — sin API key, sin costo.
export function waLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "")
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`
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
