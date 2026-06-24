import { NextRequest, NextResponse } from "next/server"
import { listarSolicitudes } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const todas = await listarSolicitudes()
  const s = todas.find((x) => x.entregaToken === token && x.entregaToken !== "")

  if (!s || !s.documentoUrl) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const slot = req.nextUrl.searchParams.get("archivo")
  const url    = slot === "2" ? s.documento2Url    : s.documentoUrl
  const nombre = slot === "2" ? s.documento2Nombre : s.documentoNombre

  if (!url) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 })

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN!
  const response = await fetch(url, { headers: { Authorization: `Bearer ${blobToken}` } })

  if (!response.ok) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 })

  const contentType = response.headers.get("content-type") ?? "application/octet-stream"
  const body = await response.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  })
}
