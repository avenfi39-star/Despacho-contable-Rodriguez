import { NextRequest, NextResponse } from "next/server"
import { actualizarColaborador } from "@/lib/db"
import { verificarToken } from "@/lib/auth"
import { normalizarTelMx } from "@/lib/whatsapp"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const patch: { nombre?: string; whatsapp?: string; activo?: boolean } = {}

  if (body.nombre !== undefined)   patch.nombre = String(body.nombre).trim()
  if (body.whatsapp !== undefined) patch.whatsapp = body.whatsapp ? normalizarTelMx(body.whatsapp) : ""
  if (body.activo !== undefined)   patch.activo = Boolean(body.activo)

  await actualizarColaborador(id, patch)
  return NextResponse.json({ ok: true })
}
