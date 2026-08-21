import { NextRequest, NextResponse } from "next/server"
import { listarColaboradores, crearColaborador } from "@/lib/db"
import { verificarToken } from "@/lib/auth"
import { normalizarTelMx } from "@/lib/whatsapp"

export async function GET(req: NextRequest) {
  const soloActivos = req.nextUrl.searchParams.get("activos") === "1"
  return NextResponse.json(await listarColaboradores(soloActivos))
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const nombre = (body.nombre ?? "").trim()
  if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 })

  // Si viene número, se normaliza; si viene vacío, se deja sin número.
  const whatsapp = body.whatsapp ? normalizarTelMx(body.whatsapp) : ""

  const nuevo = await crearColaborador({ nombre, whatsapp })
  return NextResponse.json(nuevo, { status: 201 })
}
