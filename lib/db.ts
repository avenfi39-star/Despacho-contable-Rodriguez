import { neon } from "@neondatabase/serverless"
import { Nivel } from "./catalog"

export interface Solicitud {
  id: string
  folio: number
  clienteNombre: string
  clienteWhatsapp: string
  servicioId: string
  servicioNombre: string
  nivel: Nivel
  notas: string
  asignadoA: string
  estado: "pendiente" | "en_curso" | "en_revision" | "con_observaciones" | "listo"
  observaciones: string
  archivoUrl: string
  archivoNombre: string
  documentoUrl: string
  documentoNombre: string
  entregaToken: string
  creadoEn: string
  actualizadoEn: string
}

function sql() {
  return neon(process.env.DATABASE_URL!)
}

async function inicializar() {
  const db = sql()
  await db`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id TEXT PRIMARY KEY,
      folio SERIAL,
      cliente_nombre TEXT NOT NULL,
      cliente_whatsapp TEXT NOT NULL,
      servicio_id TEXT NOT NULL,
      servicio_nombre TEXT NOT NULL,
      nivel TEXT NOT NULL,
      notas TEXT DEFAULT '',
      asignado_a TEXT DEFAULT '',
      estado TEXT DEFAULT 'pendiente',
      observaciones TEXT DEFAULT '',
      archivo_url TEXT DEFAULT '',
      archivo_nombre TEXT DEFAULT '',
      documento_url TEXT DEFAULT '',
      documento_nombre TEXT DEFAULT '',
      entrega_token TEXT DEFAULT '',
      creado_en TIMESTAMPTZ DEFAULT NOW(),
      actualizado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Agregar columnas si ya existe la tabla sin ellas
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo_nombre TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento_nombre TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS entrega_token TEXT DEFAULT ''`
}

function rowToSolicitud(r: Record<string, unknown>): Solicitud {
  return {
    id: r.id as string,
    folio: r.folio as number,
    clienteNombre: r.cliente_nombre as string,
    clienteWhatsapp: r.cliente_whatsapp as string,
    servicioId: r.servicio_id as string,
    servicioNombre: r.servicio_nombre as string,
    nivel: r.nivel as Nivel,
    notas: r.notas as string,
    asignadoA: r.asignado_a as string,
    estado: r.estado as Solicitud["estado"],
    observaciones: r.observaciones as string,
    archivoUrl: (r.archivo_url as string) ?? "",
    archivoNombre: (r.archivo_nombre as string) ?? "",
    documentoUrl: (r.documento_url as string) ?? "",
    documentoNombre: (r.documento_nombre as string) ?? "",
    entregaToken: (r.entrega_token as string) ?? "",
    creadoEn: (r.creado_en as Date).toISOString(),
    actualizadoEn: (r.actualizado_en as Date).toISOString(),
  }
}

export async function crearSolicitud(
  data: Omit<Solicitud, "id" | "folio" | "estado" | "creadoEn" | "actualizadoEn">
): Promise<Solicitud> {
  await inicializar()
  const db = sql()
  const id = crypto.randomUUID()
  const rows = await db`
    INSERT INTO solicitudes (id, cliente_nombre, cliente_whatsapp, servicio_id, servicio_nombre, nivel, notas, asignado_a, observaciones, archivo_url, archivo_nombre)
    VALUES (${id}, ${data.clienteNombre}, ${data.clienteWhatsapp}, ${data.servicioId}, ${data.servicioNombre}, ${data.nivel}, ${data.notas}, ${data.asignadoA}, ${data.observaciones}, ${data.archivoUrl}, ${data.archivoNombre})
    RETURNING *
  `
  return rowToSolicitud(rows[0])
}

export async function listarSolicitudes(): Promise<Solicitud[]> {
  await inicializar()
  const db = sql()
  const rows = await db`SELECT * FROM solicitudes ORDER BY creado_en DESC`
  return rows.map(rowToSolicitud)
}

export async function obtenerSolicitud(id: string): Promise<Solicitud | undefined> {
  await inicializar()
  const db = sql()
  const rows = await db`SELECT * FROM solicitudes WHERE id = ${id}`
  return rows[0] ? rowToSolicitud(rows[0]) : undefined
}

export async function actualizarSolicitud(
  id: string,
  patch: Partial<Solicitud>
): Promise<Solicitud | null> {
  await inicializar()
  const db = sql()
  let rows

  const asignadoA      = patch.asignadoA
  const estado         = patch.estado
  const observaciones  = patch.observaciones
  const documentoUrl   = patch.documentoUrl
  const documentoNombre = patch.documentoNombre
  const entregaToken   = patch.entregaToken

  if (asignadoA !== undefined && estado !== undefined && observaciones !== undefined) {
    rows = await db`UPDATE solicitudes SET asignado_a=${asignadoA}, estado=${estado}, observaciones=${observaciones}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (asignadoA !== undefined && estado !== undefined) {
    rows = await db`UPDATE solicitudes SET asignado_a=${asignadoA}, estado=${estado}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined && observaciones !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, observaciones=${observaciones}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined && documentoUrl !== undefined && documentoNombre !== undefined && entregaToken !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, documento_url=${documentoUrl}, documento_nombre=${documentoNombre}, entrega_token=${entregaToken}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else {
    return (await obtenerSolicitud(id)) ?? null
  }

  return rows[0] ? rowToSolicitud(rows[0]) : null
}
