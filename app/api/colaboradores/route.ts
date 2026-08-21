import { NextRequest, NextResponse } from "next/server"
import { listarColaboradores, crearColaborador, existeUsuario, crearUsuarioLogin } from "@/lib/db"
import { verificarToken } from "@/lib/auth"
import { normalizarTelMx } from "@/lib/whatsapp"
import { hashPassword, slugUsuario } from "@/lib/password"

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

  // Contraseña temporal opcional: si viene, se le crea un acceso al sistema.
  const password = body.password ? String(body.password) : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "La contraseña temporal debe tener al menos 6 caracteres" }, { status: 400 })
  }

  // Si viene número, se normaliza; si viene vacío, se deja sin número.
  const whatsapp = body.whatsapp ? normalizarTelMx(body.whatsapp) : ""

  const nuevo = await crearColaborador({ nombre, whatsapp })

  // Auto-crear el login si se dio contraseña temporal.
  let usuarioCreado: string | null = null
  if (password) {
    const base = slugUsuario(nombre) || "usuario"
    let u = base, i = 1
    while (await existeUsuario(u)) { u = `${base}${i}`; i++ }
    const { hash, salt } = hashPassword(password)
    await crearUsuarioLogin({ usuario: u, nombre, rol: "trabajador", hash, salt })
    usuarioCreado = u
  }

  return NextResponse.json({ ...nuevo, usuarioCreado }, { status: 201 })
}
