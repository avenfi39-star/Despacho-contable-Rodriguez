export type Nivel = "red" | "amber" | "green"

export interface Servicio {
  id: string
  nombre: string
  categoria: string
  nivel: Nivel
  diasHabiles: number
  asignadosPermitidos: string[]
}

export const EQUIPO = [
  { nombre: "Beatriz",    experiencia: "alta" },
  { nombre: "Trabajador", experiencia: "alta" },
  { nombre: "Ana Karen",  experiencia: "junior" },
  { nombre: "Santiago",   experiencia: "junior" },
]

export const CATALOGO: Servicio[] = [
  { id: "isr-pf",       nombre: "Declaración anual (persona física)",        categoria: "Declaraciones fiscales",        nivel: "red",   diasHabiles: 5, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "isr-pm",       nombre: "Declaración anual (persona moral)",         categoria: "Declaraciones fiscales",        nivel: "red",   diasHabiles: 5, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "isr-prov",     nombre: "Pago provisional ISR mensual",              categoria: "Declaraciones fiscales",        nivel: "amber", diasHabiles: 2, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "iva-mensual",  nombre: "Declaración mensual de IVA",                categoria: "Declaraciones fiscales",        nivel: "amber", diasHabiles: 2, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "nomina",       nombre: "Cálculo y dispersión de nómina",            categoria: "Nómina y seguridad social",     nivel: "amber", diasHabiles: 2, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "imss-alta",    nombre: "Alta o baja de empleados ante el IMSS",     categoria: "Nómina y seguridad social",     nivel: "amber", diasHabiles: 1, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "infonavit",    nombre: "Declaración bimestral INFONAVIT",           categoria: "Nómina y seguridad social",     nivel: "amber", diasHabiles: 2, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "conciliacion", nombre: "Conciliación bancaria",                     categoria: "Contabilidad",                  nivel: "amber", diasHabiles: 2, asignadosPermitidos: ["Beatriz","Trabajador","Ana Karen","Santiago"] },
  { id: "estados-fin",  nombre: "Estados financieros",                       categoria: "Contabilidad",                  nivel: "red",   diasHabiles: 4, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "cfdi",         nombre: "Factura electrónica (CFDI)",                categoria: "Trámites ante el SAT",          nivel: "green", diasHabiles: 0, asignadosPermitidos: ["Ana Karen","Santiago"] },
  { id: "csf",          nombre: "Constancia de situación fiscal",            categoria: "Trámites ante el SAT",          nivel: "green", diasHabiles: 0, asignadosPermitidos: ["Ana Karen","Santiago"] },
  { id: "opinion",      nombre: "Opinión de cumplimiento SAT",               categoria: "Trámites ante el SAT",          nivel: "green", diasHabiles: 0, asignadosPermitidos: ["Ana Karen","Santiago"] },
  { id: "aclaracion",   nombre: "Aclaración ante el SAT (buzón tributario)", categoria: "Trámites ante el SAT",          nivel: "green", diasHabiles: 1, asignadosPermitidos: ["Ana Karen","Santiago"] },
  { id: "auditoria",    nombre: "Auditoría contable interna",                categoria: "Auditoría y planeación fiscal", nivel: "red",   diasHabiles: 5, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "planeacion",   nombre: "Planeación fiscal",                         categoria: "Auditoría y planeación fiscal", nivel: "red",   diasHabiles: 3, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "constitucion", nombre: "Constitución de empresa",                   categoria: "Auditoría y planeación fiscal", nivel: "red",   diasHabiles: 5, asignadosPermitidos: ["Beatriz","Trabajador"] },
  { id: "captura",      nombre: "Captura de facturas y gastos",              categoria: "Archivo y captura",             nivel: "green", diasHabiles: 1, asignadosPermitidos: ["Ana Karen","Santiago"] },
  { id: "archivo",      nombre: "Digitalización y archivo de documentos",    categoria: "Archivo y captura",             nivel: "green", diasHabiles: 1, asignadosPermitidos: ["Ana Karen","Santiago"] },
]

export const CATEGORIAS = [...new Set(CATALOGO.map((s) => s.categoria))]

export const NIVEL_LABEL: Record<Nivel, string> = {
  red:   "🔴 Alta complejidad",
  amber: "🟡 Complejidad media",
  green: "🟢 Trámite rápido",
}

export const NIVEL_TIEMPO: Record<Nivel, string> = {
  red:   "3 – 5 días hábiles",
  amber: "1 – 2 días hábiles",
  green: "mismo día o 24 hrs",
}

export const ALERTA_SIN_ASIGNAR_HRS: Record<Nivel, number> = {
  red: 4, amber: 2, green: 1,
}

export const ALERTA_RETRASO_DIAS: Record<Nivel, number> = {
  red: 3, amber: 1, green: 0.5,
}

export function getServicio(id: string) {
  return CATALOGO.find((s) => s.id === id)
}
