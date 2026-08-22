import { upload } from "@vercel/blob/client"

// Sube un archivo directo a Vercel Blob (sin pasar por la función del servidor).
// Devuelve la URL privada del blob y el nombre original. Lanza error si falla.
export async function subirArchivo(file: File): Promise<{ url: string; nombre: string }> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const blob = await upload(`solicitudes/${safe}`, file, {
    access: "private",
    handleUploadUrl: "/api/upload",
  })
  return { url: blob.url, nombre: file.name }
}
