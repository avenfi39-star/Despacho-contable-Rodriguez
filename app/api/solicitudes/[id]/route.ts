import { NextRequest, NextResponse } from "next/server"
import { obtenerSolicitud, actualizarSolicitud } from "@/lib/db"
import { NIVEL_LABEL } from "@/lib/catalog"
import { waLink, msgTrabajadorAsignado, msgClienteListo } from "@/lib/whatsapp"

const TEAM_PHONES: Record<string, string> = {
  Beatriz:     process.env.WA_BEATRIZ     ?? "",
  Trabajador:  process.env.WA_TRABAJADOR  ?? "",
  "Ana Karen": process.env.WA_ANAKAREN   ?? "",
  Santiago:    process.env.WA_SANTIAGO    ?? "",
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { accion, asignadoA, observaciones } = body
  const s = obtenerSolicitud(id)
  if (!s) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  // ── Asignar ────────────────────────────────────────────────────────────────
  if (accion === "asignar") {
    if (!asignadoA) return NextResponse.json({ error: "Falta asignadoA" }, { status: 400 })
    const updated = actualizarSolicitud(id, { asignadoA, estado: "en_curso" })
    const phone = TEAM_PHONES[asignadoA]
    const listoUrl = `${base}/listo/${String(s.folio).padStart(4, "0")}`
    const msg =
      `📌 *Nueva tarea asignada — Despacho Rodríguez*\n\n` +
      `Hola *${asignadoA}*, tienes una solicitud nueva:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n` +
      `⏱ Nivel: ${NIVEL_LABEL[s.nivel]}\n` +
      (s.notas ? `\n📝 Notas: ${s.notas}\n` : "") +
      `\nCuando termines, marca la solicitud como lista aquí:\n` +
      `👉 ${listoUrl}\n\n` +
      `Saúl recibirá aviso automático para revisar antes de notificar al cliente.`
    const linkTrabajador = phone ? waLink(phone, msg) : null
    return NextResponse.json({ ...updated, linkTrabajador })
  }

  // ── Trabajador termina → va a revisión de Saúl ────────────────────────────
  if (accion === "terminar") {
    const updated = actualizarSolicitud(id, { estado: "en_revision" })
    const saulPhone = process.env.SAUL_WHATSAPP ?? ""
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

  // ── Saúl aprueba → notifica al cliente ────────────────────────────────────
  if (accion === "aprobar") {
    const updated = actualizarSolicitud(id, { estado: "listo" })
    const msg =
      `✅ *Tu trámite está listo — Despacho Rodríguez*\n\n` +
      `Hola, tu solicitud ha sido completada y revisada:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `Comunícate con nosotros para recibir tu documentación.\n¡Gracias por tu confianza!`
    const linkCliente = waLink(s.clienteWhatsapp, msg)
    return NextResponse.json({ ...updated, linkCliente })
  }

  // ── Saúl regresa con observaciones ────────────────────────────────────────
  if (accion === "regresar") {
    const nota = observaciones ?? "Revisar detalles."
    const updated = actualizarSolicitud(id, { estado: "con_observaciones", observaciones: nota })
    const phone = TEAM_PHONES[s.asignadoA]
    const listoUrl = `${base}/listo/${String(s.folio).padStart(4, "0")}`
    const msg =
      `🔄 *Solicitud con observaciones — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl revisó la solicitud y tiene observaciones:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `📝 *Observaciones:*\n${nota}\n\n` +
      `Cuando hagas las correcciones, marca como listo aquí:\n` +
      `👉 ${listoUrl}`
    const linkTrabajador = phone ? waLink(phone, msg) : null
    return NextResponse.json({ ...updated, linkTrabajador })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
