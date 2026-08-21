import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"
import { obtenerUsuarioLogin, setPasswordUsuario } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"

// Cambio de contraseña por el propio usuario (cualquier rol).
export async function POST(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion || !sesion.usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { actual, nueva } = await req.json()
  if (!actual || !nueva) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  if (String(nueva).length < 6) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 })

  const login = await obtenerUsuarioLogin(sesion.usuario)
  if (!login) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  if (!verifyPassword(actual, login.passwordHash, login.passwordSalt)) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 })
  }

  const { hash, salt } = hashPassword(nueva)
  await setPasswordUsuario(sesion.usuario, hash, salt)
  return NextResponse.json({ ok: true })
}
