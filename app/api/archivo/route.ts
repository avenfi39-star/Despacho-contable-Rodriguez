import { head } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 })

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN!
    const info = await head(url, { token })
    // Redirigir al downloadUrl temporal (expira en 1 hora)
    return NextResponse.redirect(info.downloadUrl)
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
  }
}
