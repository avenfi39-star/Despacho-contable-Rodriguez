import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Almacenamiento de archivos no configurado. Contacta al administrador." }, { status: 503 })
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
      return NextResponse.json({ error: "Tipo de archivo no permitido. Usa PDF, Word, Excel o imagen." }, { status: 400 })
    }

    const nombre = `solicitudes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const blob = await put(nombre, file, { access: "public" })

    return NextResponse.json({ url: blob.url, nombre: file.name })
  } catch (err) {
    console.error("Error subiendo archivo:", err)
    return NextResponse.json({ error: "Error al subir el archivo. Intenta de nuevo." }, { status: 500 })
  }
}
