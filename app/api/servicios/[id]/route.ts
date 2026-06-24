import { NextRequest, NextResponse } from "next/server"
import { actualizarServicio } from "@/lib/db"
import { verificarToken } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const patch = await req.json()
  await actualizarServicio(id, patch)
  return NextResponse.json({ ok: true })
}
