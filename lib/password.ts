import { scryptSync, randomBytes, timingSafeEqual } from "crypto"

// Hashing de contraseñas con scrypt (incluido en Node, sin dependencias).
// Solo para uso en el servidor (route handlers), NO en el middleware edge.

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false
  const intento = scryptSync(password, salt, 64)
  const guardado = Buffer.from(hash, "hex")
  return intento.length === guardado.length && timingSafeEqual(intento, guardado)
}

// Convierte un nombre en un usuario de login: "Ana Karen" -> "anakaren".
export function slugUsuario(nombre: string): string {
  return (nombre ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // solo letras y numeros
}
