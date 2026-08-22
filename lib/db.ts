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
  archivo2Url: string
  archivo2Nombre: string
  documentoUrl: string
  documentoNombre: string
  documento2Url: string
  documento2Nombre: string
  entregaToken: string
  creadoEn: string
  actualizadoEn: string
}

function sql() {
  return neon(process.env.DATABASE_URL!)
}

export interface ServicioDB {
  id: string
  nombre: string
  categoria: string
  nivel: import("./catalog").Nivel
  diasHabiles: number
  activo: boolean
}

async function inicializarServicios() {
  const db = sql()
  await db`
    CREATE TABLE IF NOT EXISTS servicios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      nivel TEXT NOT NULL,
      dias_habiles INTEGER NOT NULL DEFAULT 1,
      activo BOOLEAN NOT NULL DEFAULT TRUE
    )
  `
  const { CATALOGO } = await import("./catalog")
  const existing = await db`SELECT id FROM servicios`
  const existingIds = new Set(existing.map((r) => r.id as string))
  for (const s of CATALOGO) {
    if (!existingIds.has(s.id)) {
      await db`INSERT INTO servicios (id, nombre, categoria, nivel, dias_habiles, activo)
               VALUES (${s.id}, ${s.nombre}, ${s.categoria}, ${s.nivel}, ${s.diasHabiles}, TRUE)`
    }
  }
}

export async function listarServicios(soloActivos = false): Promise<ServicioDB[]> {
  await inicializarServicios()
  const db = sql()
  const rows = soloActivos
    ? await db`SELECT * FROM servicios WHERE activo = TRUE ORDER BY categoria, nombre`
    : await db`SELECT * FROM servicios ORDER BY categoria, nombre`
  return rows.map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    categoria: r.categoria as string,
    nivel: r.nivel as ServicioDB["nivel"],
    diasHabiles: r.dias_habiles as number,
    activo: r.activo as boolean,
  }))
}

export async function crearServicio(data: Omit<ServicioDB, "id" | "activo">): Promise<ServicioDB> {
  await inicializarServicios()
  const db = sql()
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const rows = await db`INSERT INTO servicios (id, nombre, categoria, nivel, dias_habiles, activo)
    VALUES (${id}, ${data.nombre}, ${data.categoria}, ${data.nivel}, ${data.diasHabiles}, TRUE) RETURNING *`
  return { id: rows[0].id, nombre: rows[0].nombre, categoria: rows[0].categoria, nivel: rows[0].nivel, diasHabiles: rows[0].dias_habiles, activo: rows[0].activo }
}

export async function actualizarServicio(id: string, patch: Partial<ServicioDB>): Promise<void> {
  await inicializarServicios()
  const db = sql()
  if (patch.activo !== undefined) await db`UPDATE servicios SET activo=${patch.activo} WHERE id=${id}`
  if (patch.nombre !== undefined) await db`UPDATE servicios SET nombre=${patch.nombre} WHERE id=${id}`
  if (patch.categoria !== undefined) await db`UPDATE servicios SET categoria=${patch.categoria} WHERE id=${id}`
  if (patch.nivel !== undefined) await db`UPDATE servicios SET nivel=${patch.nivel} WHERE id=${id}`
  if (patch.diasHabiles !== undefined) await db`UPDATE servicios SET dias_habiles=${patch.diasHabiles} WHERE id=${id}`
}

// ─── Colaboradores (equipo) ───────────────────────────────────────────────────

export type ColaboradorRol = "saul" | "colaborador"

export interface Colaborador {
  id: string
  nombre: string
  whatsapp: string
  rol: ColaboradorRol
  activo: boolean
}

async function inicializarColaboradores() {
  const db = sql()
  await db`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      whatsapp TEXT NOT NULL DEFAULT '',
      rol TEXT NOT NULL DEFAULT 'colaborador',
      activo BOOLEAN NOT NULL DEFAULT TRUE
    )
  `
  const { EQUIPO } = await import("./catalog")
  // Corrección de nombre viejo ANTES de leer los existentes (evita duplicar al admin).
  await db`UPDATE colaboradores SET nombre='Saúl Rodríguez' WHERE rol='saul' AND nombre='Saúl'`
  const existing = await db`SELECT nombre FROM colaboradores`
  const existingNombres = new Set(existing.map((r) => r.nombre as string))
  // Semilla: cada integrante del EQUIPO + Saúl. Los números empiezan vacíos.
  const semilla: { nombre: string; rol: ColaboradorRol }[] = [
    { nombre: "Saúl Rodríguez", rol: "saul" },
    ...EQUIPO.map((e) => ({ nombre: e.nombre, rol: "colaborador" as ColaboradorRol })),
  ]
  for (const c of semilla) {
    if (!existingNombres.has(c.nombre)) {
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      await db`INSERT INTO colaboradores (id, nombre, whatsapp, rol, activo)
               VALUES (${id}, ${c.nombre}, '', ${c.rol}, TRUE)`
    }
  }
}

function rowToColaborador(r: Record<string, unknown>): Colaborador {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    whatsapp: (r.whatsapp as string) ?? "",
    rol: r.rol as ColaboradorRol,
    activo: r.activo as boolean,
  }
}

export async function listarColaboradores(soloActivos = false): Promise<Colaborador[]> {
  await inicializarColaboradores()
  const db = sql()
  const rows = soloActivos
    ? await db`SELECT * FROM colaboradores WHERE activo = TRUE ORDER BY rol DESC, nombre`
    : await db`SELECT * FROM colaboradores ORDER BY rol DESC, nombre`
  return rows.map(rowToColaborador)
}

export async function crearColaborador(data: { nombre: string; whatsapp?: string }): Promise<Colaborador> {
  await inicializarColaboradores()
  const db = sql()
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const rows = await db`INSERT INTO colaboradores (id, nombre, whatsapp, rol, activo)
    VALUES (${id}, ${data.nombre}, ${data.whatsapp ?? ""}, 'colaborador', TRUE) RETURNING *`
  return rowToColaborador(rows[0])
}

export async function actualizarColaborador(id: string, patch: Partial<Pick<Colaborador, "nombre" | "whatsapp" | "activo">>): Promise<void> {
  await inicializarColaboradores()
  const db = sql()
  if (patch.nombre !== undefined)   await db`UPDATE colaboradores SET nombre=${patch.nombre} WHERE id=${id}`
  if (patch.whatsapp !== undefined) await db`UPDATE colaboradores SET whatsapp=${patch.whatsapp} WHERE id=${id}`
  if (patch.activo !== undefined)   await db`UPDATE colaboradores SET activo=${patch.activo} WHERE id=${id}`
}

// Devuelve el WhatsApp de un colaborador por su nombre (o "" si no tiene/existe).
export async function getTelefono(nombre: string): Promise<string> {
  await inicializarColaboradores()
  const db = sql()
  const rows = await db`SELECT whatsapp FROM colaboradores WHERE nombre=${nombre} LIMIT 1`
  return rows[0] ? ((rows[0].whatsapp as string) ?? "") : ""
}

// Devuelve el WhatsApp de Saúl (el colaborador con rol 'saul').
export async function getTelefonoSaul(): Promise<string> {
  await inicializarColaboradores()
  const db = sql()
  const rows = await db`SELECT whatsapp FROM colaboradores WHERE rol='saul' ORDER BY nombre LIMIT 1`
  return rows[0] ? ((rows[0].whatsapp as string) ?? "") : ""
}

// ─── Usuarios (accesos al sistema) ────────────────────────────────────────────

export interface UsuarioLogin {
  usuario: string
  nombre: string
  rol: "saul" | "trabajador"
  passwordHash: string
  passwordSalt: string
  activo: boolean
}

export interface UsuarioAdmin {
  usuario: string
  nombre: string
  rol: "saul" | "trabajador"
  activo: boolean
}

async function inicializarUsuarios() {
  const db = sql()
  await db`
    CREATE TABLE IF NOT EXISTS usuarios (
      usuario TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'trabajador',
      activo BOOLEAN NOT NULL DEFAULT TRUE
    )
  `
  // Semilla: los accesos actuales, con la contraseña ya hasheada.
  const { obtenerUsuarios } = await import("./auth")
  const { hashPassword } = await import("./password")
  const existing = await db`SELECT usuario FROM usuarios`
  const ids = new Set(existing.map((r) => r.usuario as string))
  for (const u of obtenerUsuarios()) {
    if (!ids.has(u.usuario)) {
      const { hash, salt } = hashPassword(u.password)
      await db`INSERT INTO usuarios (usuario, nombre, password_hash, password_salt, rol, activo)
               VALUES (${u.usuario}, ${u.nombre}, ${hash}, ${salt}, ${u.rol}, TRUE)`
    }
  }
  // Corrección de nombre viejo en registros ya sembrados.
  await db`UPDATE usuarios SET nombre='Saúl Rodríguez' WHERE usuario='saul' AND nombre='Saúl González'`
}

export async function obtenerUsuarioLogin(usuario: string): Promise<UsuarioLogin | undefined> {
  await inicializarUsuarios()
  const db = sql()
  const rows = await db`SELECT * FROM usuarios WHERE usuario=${usuario} LIMIT 1`
  const r = rows[0]
  if (!r) return undefined
  return {
    usuario: r.usuario as string,
    nombre: r.nombre as string,
    rol: r.rol as "saul" | "trabajador",
    passwordHash: r.password_hash as string,
    passwordSalt: r.password_salt as string,
    activo: r.activo as boolean,
  }
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  await inicializarUsuarios()
  const db = sql()
  const rows = await db`SELECT usuario, nombre, rol, activo FROM usuarios ORDER BY rol DESC, nombre`
  return rows.map((r) => ({
    usuario: r.usuario as string,
    nombre: r.nombre as string,
    rol: r.rol as "saul" | "trabajador",
    activo: r.activo as boolean,
  }))
}

export async function setPasswordUsuario(usuario: string, hash: string, salt: string): Promise<void> {
  await inicializarUsuarios()
  const db = sql()
  await db`UPDATE usuarios SET password_hash=${hash}, password_salt=${salt} WHERE usuario=${usuario}`
}

export async function existeUsuario(usuario: string): Promise<boolean> {
  await inicializarUsuarios()
  const db = sql()
  const rows = await db`SELECT 1 FROM usuarios WHERE usuario=${usuario} LIMIT 1`
  return rows.length > 0
}

export async function crearUsuarioLogin(data: { usuario: string; nombre: string; rol?: "saul" | "trabajador"; hash: string; salt: string }): Promise<void> {
  await inicializarUsuarios()
  const db = sql()
  await db`INSERT INTO usuarios (usuario, nombre, password_hash, password_salt, rol, activo)
           VALUES (${data.usuario}, ${data.nombre}, ${data.hash}, ${data.salt}, ${data.rol ?? "trabajador"}, TRUE)
           ON CONFLICT (usuario) DO NOTHING`
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
      archivo2_url TEXT DEFAULT '',
      archivo2_nombre TEXT DEFAULT '',
      documento_url TEXT DEFAULT '',
      documento_nombre TEXT DEFAULT '',
      documento2_url TEXT DEFAULT '',
      documento2_nombre TEXT DEFAULT '',
      entrega_token TEXT DEFAULT '',
      creado_en TIMESTAMPTZ DEFAULT NOW(),
      actualizado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Agregar columnas si ya existe la tabla sin ellas
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo_nombre TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo2_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS archivo2_nombre TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento_nombre TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento2_url TEXT DEFAULT ''`
  await db`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS documento2_nombre TEXT DEFAULT ''`
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
    archivo2Url: (r.archivo2_url as string) ?? "",
    archivo2Nombre: (r.archivo2_nombre as string) ?? "",
    documentoUrl: (r.documento_url as string) ?? "",
    documentoNombre: (r.documento_nombre as string) ?? "",
    documento2Url: (r.documento2_url as string) ?? "",
    documento2Nombre: (r.documento2_nombre as string) ?? "",
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
    INSERT INTO solicitudes (id, cliente_nombre, cliente_whatsapp, servicio_id, servicio_nombre, nivel, notas, asignado_a, observaciones, archivo_url, archivo_nombre, archivo2_url, archivo2_nombre)
    VALUES (${id}, ${data.clienteNombre}, ${data.clienteWhatsapp}, ${data.servicioId}, ${data.servicioNombre}, ${data.nivel}, ${data.notas}, ${data.asignadoA}, ${data.observaciones}, ${data.archivoUrl}, ${data.archivoNombre}, ${data.archivo2Url}, ${data.archivo2Nombre})
    RETURNING *
  `
  return rowToSolicitud(rows[0])
}

export async function eliminarSolicitud(id: string): Promise<void> {
  await inicializar()
  const db = sql()
  await db`DELETE FROM solicitudes WHERE id = ${id}`
  // Si ya no queda ninguna solicitud, reiniciar el contador de folios a #0001.
  const rows = await db`SELECT COUNT(*)::int AS n FROM solicitudes`
  if (((rows[0]?.n as number) ?? 0) === 0) {
    await db`SELECT setval(pg_get_serial_sequence('solicitudes','folio'), 1, false)`
  }
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
    const d2u = patch.documento2Url ?? ""
    const d2n = patch.documento2Nombre ?? ""
    rows = await db`UPDATE solicitudes SET estado=${estado}, documento_url=${documentoUrl}, documento_nombre=${documentoNombre}, documento2_url=${d2u}, documento2_nombre=${d2n}, entrega_token=${entregaToken}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else if (estado !== undefined) {
    rows = await db`UPDATE solicitudes SET estado=${estado}, actualizado_en=NOW() WHERE id=${id} RETURNING *`
  } else {
    return (await obtenerSolicitud(id)) ?? null
  }

  return rows[0] ? rowToSolicitud(rows[0]) : null
}
