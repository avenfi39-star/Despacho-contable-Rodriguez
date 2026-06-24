import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const sesion = await verificarToken(token)
  if (!sesion) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
  return NextResponse.json(sesion)
}
