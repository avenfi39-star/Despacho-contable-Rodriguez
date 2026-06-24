import { NextRequest, NextResponse } from "next/server"
import { listarServicios, crearServicio } from "@/lib/db"
import { verificarToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const soloActivos = req.nextUrl.searchParams.get("activos") === "1"
  return NextResponse.json(await listarServicios(soloActivos))
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { nombre, categoria, nivel, diasHabiles } = body
  if (!nombre || !categoria || !nivel) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

  const nuevo = await crearServicio({ nombre, categoria, nivel, diasHabiles: diasHabiles ?? 1 })
  return NextResponse.json(nuevo, { status: 201 })
}
