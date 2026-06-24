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
      creado_en TIMESTAMPTZ DEFAULT NOW(),
      actualizado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `
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
    INSERT INTO solicitudes (id, cliente_nombre, cliente_whatsapp, servicio_id, servicio_nombre, nivel, notas, asignado_a, observaciones)
    VALUES (${id}, ${data.clienteNombre}, ${data.clienteWhatsapp}, ${data.servicioId}, ${data.servicioNombre}, ${data.nivel}, ${data.notas}, ${data.asignadoA}, ${data.observaciones})
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

  const asignadoA   = patch.asignadoA
  const estado      = patch.estado
  const observaciones = patch.observaciones

  if (asignadoA !== undefined && estado !== undefined && observaciones !== undefined) {
    rows = await db`UPDATE solicitudes SET asignado_a=${asignadoA}, estado=${estado}, observaciones=${observaciones}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (asignadoA !== undefined && estado !== undefined) {
    rows = await db`UPDATE solicitudes SET asignado_a=${asignadoA}, estado=${estado}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined && observaciones !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, observaciones=${observaciones}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else {
    return (await obtenerSolicitud(id)) ?? null
  }

  return rows[0] ? rowToSolicitud(rows[0]) : null
}
