import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"
import { listarUsuarios } from "@/lib/db"

// Lista de accesos (sin contraseñas). Solo Saúl.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  return NextResponse.json(await listarUsuarios())
}
