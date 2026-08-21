import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"
import { existeUsuario, setPasswordUsuario } from "@/lib/db"
import { hashPassword } from "@/lib/password"

// Restablecer la contraseña de un usuario. Solo Saúl.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ usuario: string }> }) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || sesion.rol !== "saul") return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { usuario } = await params
  const { nueva } = await req.json()
  if (!nueva || String(nueva).length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }
  if (!(await existeUsuario(usuario))) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { hash, salt } = hashPassword(nueva)
  await setPasswordUsuario(usuario, hash, salt)
  return NextResponse.json({ ok: true })
}
