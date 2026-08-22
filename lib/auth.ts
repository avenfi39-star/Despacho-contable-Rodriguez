import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "despacho-secret-2024")

export type Rol = "saul" | "trabajador"

export interface Sesion {
  usuario: string
  nombre: string
  rol: Rol
}

export async function crearToken(sesion: Sesion): Promise<string> {
  return new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(SECRET)
}

export async function verificarToken(token: string): Promise<Sesion | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { usuario: (payload.usuario as string) ?? "", nombre: payload.nombre as string, rol: payload.rol as Rol }
  } catch {
    return null
  }
}

export function obtenerUsuarios() {
  return [
    { usuario: "saul",       password: process.env.SAUL_PASSWORD      ?? "saul2024",      rol: "saul"      as Rol, nombre: "Saúl Rodríguez" },
    { usuario: "beatriz",    password: process.env.BEATRIZ_PASSWORD    ?? "beatriz2024",   rol: "trabajador" as Rol, nombre: "Beatriz" },
    { usuario: "anakaren",   password: process.env.ANAKAREN_PASSWORD   ?? "anakaren2024",  rol: "trabajador" as Rol, nombre: "Ana Karen" },
    { usuario: "santiago",   password: process.env.SANTIAGO_PASSWORD   ?? "santiago2024",  rol: "trabajador" as Rol, nombre: "Santiago" },
    { usuario: "trabajador", password: process.env.TRABAJADOR_PASSWORD ?? "trabajador2024",rol: "trabajador" as Rol, nombre: "Trabajador" },
  ]
}
