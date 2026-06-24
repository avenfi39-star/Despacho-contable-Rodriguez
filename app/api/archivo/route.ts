import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  // Solo usuarios autenticados pueden descargar archivos
  const token = req.cookies.get("dr-session")?.value
  const sesion = token ? await verificarToken(token) : null
  if (!sesion) {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 })

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN!
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${blobToken}` },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream"
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    })
  } catch (err) {
    console.error("Error descargando archivo:", err)
    return NextResponse.json({ error: "Error al acceder al archivo" }, { status: 500 })
  }
}
