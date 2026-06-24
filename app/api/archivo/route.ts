import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 })

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN!
    // Descargar el archivo desde Vercel Blob usando el token
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
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
