import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Almacenamiento de archivos no configurado. Contacta al administrador.", debug: "NO_TOKEN" }, { status: 503 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 })

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase()
    const permitidos = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"]
    if (!ext || !permitidos.includes(ext)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 })
    }

    const nombre = `solicitudes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const blob = await put(nombre, file, { access: "private", token })

    return NextResponse.json({ url: blob.url, nombre: file.name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Upload error:", msg)
    return NextResponse.json({ error: "Error al subir el archivo. Intenta de nuevo.", debug: msg }, { status: 500 })
  }
}
