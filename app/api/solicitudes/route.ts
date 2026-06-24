import { NextRequest, NextResponse } from "next/server"
import { crearSolicitud, listarSolicitudes } from "@/lib/db"
import { getServicio, NIVEL_TIEMPO } from "@/lib/catalog"
import { waLink, msgClienteRecibido } from "@/lib/whatsapp"

export async function GET() {
  return NextResponse.json(await listarSolicitudes())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clienteNombre, clienteWhatsapp, servicioId, notas, archivoUrl, archivoNombre, archivo2Url, archivo2Nombre } = body

  if (!clienteNombre || !clienteWhatsapp || !servicioId) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const servicio = getServicio(servicioId)
  if (!servicio) {
    return NextResponse.json({ error: "Servicio no válido" }, { status: 400 })
  }

  const solicitud = await crearSolicitud({
    clienteNombre,
    clienteWhatsapp,
    servicioId,
    servicioNombre: servicio.nombre,
    nivel: servicio.nivel,
    notas: notas ?? "",
    asignadoA: "",
    observaciones: "",
    archivoUrl: archivoUrl ?? "",
    archivoNombre: archivoNombre ?? "",
    archivo2Url: archivo2Url ?? "",
    archivo2Nombre: archivo2Nombre ?? "",
    documentoUrl: "",
    documentoNombre: "",
    documento2Url: "",
    documento2Nombre: "",
    entregaToken: "",
  })

  const linkCliente = waLink(
    clienteWhatsapp,
    msgClienteRecibido({
      folio: solicitud.folio,
      servicio: servicio.nombre,
      tiempo: NIVEL_TIEMPO[servicio.nivel],
    })
  )

  const saulWA = process.env.SAUL_WHATSAPP ?? ""
  const linkSaul = saulWA
    ? waLink(saulWA, `📥 *Nueva solicitud recibida*\n\nCliente: *${clienteNombre}*\nServicio: *${servicio.nombre}*\nFolio: *#${String(solicitud.folio).padStart(4, "0")}*\n\nEntra al dashboard para asignarla.`)
    : null

  return NextResponse.json({ ...solicitud, linkCliente, linkSaul }, { status: 201 })
}
