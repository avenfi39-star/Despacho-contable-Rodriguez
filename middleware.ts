import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("dr-session")?.value
  const pathname = req.nextUrl.pathname

  const sesion = token ? await verificarToken(token) : null

  // Proteger /dashboard — solo Saúl
  if (pathname.startsWith("/dashboard")) {
    if (!sesion || sesion.rol !== "saul") {
      return NextResponse.redirect(new URL("/login?ruta=dashboard", req.url))
    }
  }

  // Proteger /operativo — solo trabajadores
  if (pathname.startsWith("/operativo")) {
    if (!sesion || sesion.rol !== "trabajador") {
      return NextResponse.redirect(new URL("/login?ruta=operativo", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/operativo/:path*"],
}
