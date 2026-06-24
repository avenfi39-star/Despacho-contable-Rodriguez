import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 })

  const maxMB = 10
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ error: `El archivo no puede superar ${maxMB} MB` }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase()
  const permitidos = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"]
  if (!ext || !permitidos.includes(ext)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 })
  }

  const nombre = `solicitudes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const blob = await put(nombre, file, { access: "public" })

  return NextResponse.json({ url: blob.url, nombre: file.name })
}
