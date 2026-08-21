import { NextRequest, NextResponse } from "next/server"
import { crearToken } from "@/lib/auth"
import { obtenerUsuarioLogin } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json()
  const login = (usuario ?? "").toLowerCase().trim()
  const found = await obtenerUsuarioLogin(login)

  if (!found || !found.activo || !verifyPassword(password ?? "", found.passwordHash, found.passwordSalt)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 })
  }

  const token = await crearToken({ usuario: found.usuario, nombre: found.nombre, rol: found.rol })
  const res = NextResponse.json({ rol: found.rol, nombre: found.nombre })
  res.cookies.set("dr-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 horas
    path: "/",
  })
  return res
}
