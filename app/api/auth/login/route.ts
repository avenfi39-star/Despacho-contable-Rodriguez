import { NextRequest, NextResponse } from "next/server"
import { crearToken, obtenerUsuarios } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { usuario, password } = await req.json()
  const usuarios = obtenerUsuarios()
  const found = usuarios.find((u) => u.usuario === usuario?.toLowerCase().trim() && u.password === password)

  if (!found) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 })
  }

  const token = await crearToken({ nombre: found.nombre, rol: found.rol })
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
