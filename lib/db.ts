import fs from "fs"
import path from "path"
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

interface Store {
  solicitudes: Solicitud[]
  folioCounter: number
}

const DB_PATH = path.join(process.cwd(), "data", "db.json")

function leerStore(): Store {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ solicitudes: [], folioCounter: 1 }))
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"))
  } catch {
    return { solicitudes: [], folioCounter: 1 }
  }
}

function guardarStore(store: Store) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2))
}

export function crearSolicitud(data: Omit<Solicitud, "id" | "folio" | "estado" | "creadoEn" | "actualizadoEn">): Solicitud {
  const store = leerStore()
  const now = new Date().toISOString()
  const s: Solicitud = {
    ...data,
    id: crypto.randomUUID(),
    folio: store.folioCounter++,
    estado: "pendiente",
    observaciones: "",
    creadoEn: now,
    actualizadoEn: now,
  }
  store.solicitudes.unshift(s)
  guardarStore(store)
  return s
}

export function listarSolicitudes(): Solicitud[] {
  return leerStore().solicitudes
}

export function obtenerSolicitud(id: string): Solicitud | undefined {
  return leerStore().solicitudes.find((s) => s.id === id)
}

export function actualizarSolicitud(id: string, patch: Partial<Solicitud>): Solicitud | null {
  const store = leerStore()
  const idx = store.solicitudes.findIndex((s) => s.id === id)
  if (idx === -1) return null
  store.solicitudes[idx] = { ...store.solicitudes[idx], ...patch, actualizadoEn: new Date().toISOString() }
  guardarStore(store)
  return store.solicitudes[idx]
}
