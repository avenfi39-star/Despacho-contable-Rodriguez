import { NextRequest, NextResponse } from "next/server"
import { obtenerSolicitud, actualizarSolicitud, getTelefono, getTelefonoSaul } from "@/lib/db"
import { NIVEL_LABEL } from "@/lib/catalog"
import { waLink } from "@/lib/whatsapp"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { accion, asignadoA, observaciones } = body
  const s = await obtenerSolicitud(id)
  if (!s) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://despacho-contable-rodriguez.vercel.app"

  if (accion === "asignar") {
    if (!asignadoA) return NextResponse.json({ error: "Falta asignadoA" }, { status: 400 })
    const updated = await actualizarSolicitud(id, { asignadoA, estado: "en_curso" })
    const phone = await getTelefono(asignadoA)
    const msg =
      `📌 *Nueva tarea asignada — Despacho Rodríguez*\n\n` +
      `Hola *${asignadoA}*, tienes una solicitud nueva:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n` +
      `⏱ Nivel: ${NIVEL_LABEL[s.nivel]}\n` +
      (s.notas ? `\n📝 Notas: ${s.notas}\n` : "") +
      `\nEntra al sistema y selecciona *Acceso colaboradores* para verla:\n` +
      `👉 ${base}\n\n` +
      `Saúl revisará antes de notificar al cliente.`
    const linkTrabajador = phone ? waLink(phone, msg) : null
    return NextResponse.json({ ...updated, linkTrabajador })
  }

  if (accion === "terminar") {
    const { documentoUrl, documentoNombre, documento2Url, documento2Nombre } = body
    const patch: Record<string, string> = { estado: "en_revision" }
    if (documentoUrl)  { patch.documentoUrl = documentoUrl; patch.documentoNombre = documentoNombre ?? "" }
    if (documento2Url) { patch.documento2Url = documento2Url; patch.documento2Nombre = documento2Nombre ?? "" }
    const updated = await actualizarSolicitud(id, patch)
    const saulPhone = await getTelefonoSaul()
    const dashUrl = `${base}/dashboard`
    const msg =
      `✅ *Solicitud lista para revisión*\n\n` +
      `*${s.asignadoA}* terminó la siguiente solicitud:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `Revísala y aprueba o devuelve con observaciones:\n` +
      `👉 ${dashUrl}`
    const linkSaul = saulPhone ? waLink(saulPhone, msg) : null
    return NextResponse.json({ ...updated, linkSaul })
  }

  if (accion === "aprobar") {
    const { documentoUrl, documentoNombre, documento2Url, documento2Nombre } = body
    const entregaToken = crypto.randomUUID().replace(/-/g, "")
    const patch: Partial<import("@/lib/db").Solicitud> = { estado: "listo" }
    if (documentoUrl && documentoNombre) {
      patch.documentoUrl = documentoUrl
      patch.documentoNombre = documentoNombre
      patch.documento2Url = documento2Url ?? ""
      patch.documento2Nombre = documento2Nombre ?? ""
      patch.entregaToken = entregaToken
    }
    const updated = await actualizarSolicitud(id, patch)
    const entregaUrl = documentoUrl ? `${base}/entrega/${entregaToken}` : null
    const msg =
      `✅ *Tu trámite está listo — Despacho Rodríguez*\n\n` +
      `Hola *${s.clienteNombre}*, tu solicitud ha sido completada y revisada:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      (entregaUrl
        ? `📥 *Descarga tu documento aquí:*\n👉 ${entregaUrl}\n\n`
        : `Comunícate con nosotros para recibir tu documentación.\n\n`) +
      `¡Gracias por tu confianza!`
    const linkCliente = waLink(s.clienteWhatsapp, msg)
    return NextResponse.json({ ...updated, linkCliente })
  }

  if (accion === "regresar") {
    const nota = observaciones ?? "Revisar detalles."
    const updated = await actualizarSolicitud(id, { estado: "con_observaciones", observaciones: nota })
    const phone = await getTelefono(s.asignadoA)
    const msg =
      `🔄 *Solicitud con observaciones — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl revisó la solicitud y tiene observaciones:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `📝 *Observaciones:*\n${nota}\n\n` +
      `Entra al sistema para ver los detalles y marcarla como lista:\n` +
      `👉 ${base}`
    const linkTrabajador = phone ? waLink(phone, msg) : null
    return NextResponse.json({ ...updated, linkTrabajador })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
