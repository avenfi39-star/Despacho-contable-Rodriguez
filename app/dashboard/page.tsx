"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ServicioDB, Solicitud, Colaborador } from "@/lib/db"
import { NIVEL_LABEL, ALERTA_SIN_ASIGNAR_HRS, ALERTA_RETRASO_DIAS } from "@/lib/catalog"
import CambiarPassword from "@/components/CambiarPassword"
import { subirArchivo } from "@/lib/subirArchivo"

function waLink(phone: string, msg: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
}
function abrirWA(phone: string, msg: string) { window.open(waLink(phone, msg), "_blank") }

// Muestra un número guardado (526671234567) como "+52 667 123 4567".
function fmtTel(raw: string) {
  const d = (raw ?? "").replace(/\D/g, "")
  const local = d.length > 10 && d.startsWith("52") ? d.slice(-10) : d
  if (local.length === 10) return `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  return raw || "—"
}

function horasDesde(iso: string) { return (Date.now() - new Date(iso).getTime()) / 36e5 }
function fmtTiempo(iso: string) {
  const h = horasDesde(iso)
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 24) return `${Math.round(h)} hrs`
  return `${Math.round(h / 24)} días`
}

type Alerta = "ok" | "advertencia" | "vencida"
function nivelAlerta(s: Solicitud): Alerta {
  if (s.estado === "listo" || s.estado === "en_revision") return "ok"
  if (s.estado === "pendiente") {
    const h = horasDesde(s.creadoEn)
    const u = ALERTA_SIN_ASIGNAR_HRS[s.nivel]
    return h > u * 2 ? "vencida" : h > u ? "advertencia" : "ok"
  }
  const d = horasDesde(s.actualizadoEn) / 24
  const u = ALERTA_RETRASO_DIAS[s.nivel]
  return d > u * 2 ? "vencida" : d > u ? "advertencia" : "ok"
}

const NIVEL_DOT:   Record<string, string> = { red: "bg-red-400", amber: "bg-amber-400", green: "bg-green-500" }
const NIVEL_BADGE: Record<string, string> = { red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", green: "bg-green-50 text-green-700" }
const ALERTA_BG:   Record<Alerta, string> = { ok: "", advertencia: "bg-amber-50", vencida: "bg-red-50" }
const ALERTA_TAG:  Record<Alerta, string> = { ok: "", advertencia: "bg-amber-100 text-amber-700", vencida: "bg-red-100 text-red-700" }

function ArchivoLink({ url, nombre }: { url: string; nombre: string }) {
  if (!url) return null
  const ext = nombre.split(".").pop()?.toLowerCase() ?? ""
  const icono = ext === "pdf" ? "📄" : ["jpg","jpeg","png"].includes(ext) ? "🖼️" : ["xls","xlsx"].includes(ext) ? "📊" : "📎"
  const href = `/api/archivo?url=${encodeURIComponent(url)}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg px-2.5 py-1 transition-colors mt-2">
      <span>{icono}</span>
      <span className="max-w-[180px] truncate">{nombre}</span>
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </a>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [solicitudes, setSolicitudes]   = useState<Solicitud[]>([])
  const [loading, setLoading]           = useState(true)
  const [asignando, setAsignando]       = useState<Record<string, string>>({})
  const [accionando, setAccionando]     = useState<string | null>(null)
  const [observacion, setObservacion]   = useState<Record<string, string>>({})
  const [docEntrega, setDocEntrega]     = useState<Record<string, { url: string; nombre: string; url2: string; nombre2: string }>>({})
  const [subiendoDoc, setSubiendoDoc]   = useState<string | null>(null)
  const [regresando, setRegresando]     = useState<string | null>(null)
  const [vista, setVista]               = useState<"equipo" | "lista" | "servicios" | "colaboradores">("equipo")
  const [servicios, setServicios]       = useState<ServicioDB[]>([])
  const [nuevoSvc, setNuevoSvc]         = useState({ nombre: "", categoria: "", nivel: "green" as ServicioDB["nivel"], diasHabiles: 1 })
  const [guardandoSvc, setGuardandoSvc] = useState(false)
  const [editandoSvc, setEditandoSvc]   = useState<string | null>(null)
  const [svcDraft, setSvcDraft]         = useState({ nombre: "", categoria: "", nivel: "green" as ServicioDB["nivel"], diasHabiles: 1 })
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [editWA, setEditWA]             = useState<Record<string, string>>({})
  const [guardandoColab, setGuardandoColab] = useState<string | null>(null)
  const [nuevoColab, setNuevoColab]     = useState("")
  const [nuevoColabPw, setNuevoColabPw] = useState("")
  const [accesoCreado, setAccesoCreado] = useState<string | null>(null)
  const [usuarios, setUsuarios]         = useState<{ usuario: string; nombre: string; rol: string; activo: boolean }[]>([])
  const [resetPw, setResetPw]           = useState<Record<string, string>>({})
  const [reseteando, setReseteando]     = useState<string | null>(null)
  const [refrescando, setRefrescando]   = useState(false)

  // Derivados del equipo: mapa de teléfonos por nombre y lista de nombres asignables.
  const teamPhones: Record<string, string> = Object.fromEntries(colaboradores.map((c) => [c.nombre, c.whatsapp]))
  const nombresEquipo = colaboradores.filter((c) => c.rol === "colaborador" && c.activo).map((c) => c.nombre)

  const cargar = useCallback(async () => {
    const r = await fetch("/api/solicitudes")
    setSolicitudes(await r.json())
    setLoading(false)
  }, [])

  const cargarServicios = useCallback(async () => {
    const r = await fetch("/api/servicios")
    setServicios(await r.json())
  }, [])

  const cargarColaboradores = useCallback(async () => {
    const r = await fetch("/api/colaboradores")
    setColaboradores(await r.json())
  }, [])

  const cargarUsuarios = useCallback(async () => {
    const r = await fetch("/api/usuarios")
    if (r.ok) setUsuarios(await r.json())
  }, [])

  const refrescarTodo = useCallback(async () => {
    setRefrescando(true)
    try {
      await Promise.all([cargar(), cargarServicios(), cargarColaboradores(), cargarUsuarios()])
    } finally {
      setRefrescando(false)
    }
  }, [cargar, cargarServicios, cargarColaboradores, cargarUsuarios])

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t) }, [cargar])
  useEffect(() => { cargarServicios() }, [cargarServicios])
  useEffect(() => { cargarColaboradores() }, [cargarColaboradores])
  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  // ── Acciones ──────────────────────────────────────────────────────────────

  function handleAsignar(s: Solicitud) {
    const persona = asignando[s.id]
    if (!persona) return
    const phone = teamPhones[persona]
    const base = window.location.origin
    const panelUrl = `${base}/operativo`
    const msg =
      `📌 *Nueva tarea asignada — Despacho Rodríguez*\n\n` +
      `Hola *${persona}*, tienes una solicitud nueva:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n` +
      `⏱ Nivel: ${NIVEL_LABEL[s.nivel]}\n` +
      (s.notas ? `\n📝 Notas: ${s.notas}\n` : "") +
      `\nEntra a tu panel (con tu usuario y contraseña), sube tu documento y márcala como lista:\n👉 ${panelUrl}\n\n` +
      `Saúl revisará antes de notificar al cliente.`
    if (phone) abrirWA(phone, msg)
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "asignar", asignadoA: persona }),
    }).then(() => { setAsignando((p) => { const n = { ...p }; delete n[s.id]; return n }); cargar() })
      .finally(() => setAccionando(null))
  }

  async function subirDocEntrega(id: string, file: File, slot: 1 | 2) {
    setSubiendoDoc(id)
    try {
      const data = await subirArchivo(file)
      setDocEntrega((p) => {
        const prev = p[id] ?? { url: "", nombre: "", url2: "", nombre2: "" }
        return { ...p, [id]: slot === 1 ? { ...prev, url: data.url, nombre: data.nombre } : { ...prev, url2: data.url, nombre2: data.nombre } }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo subir el archivo")
    } finally {
      setSubiendoDoc(null)
    }
  }

  function handleAprobar(s: Solicitud) {
    const doc = docEntrega[s.id]
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar", documentoUrl: doc?.url ?? "", documentoNombre: doc?.nombre ?? "", documento2Url: doc?.url2 ?? "", documento2Nombre: doc?.nombre2 ?? "" }),
    }).then(async (res) => {
      const data = await res.json()
      if (data.linkCliente) window.open(data.linkCliente, "_blank")
      cargar()
    }).finally(() => setAccionando(null))
  }

  function handleRegresar(s: Solicitud) {
    const nota = observacion[s.id]?.trim()
    if (!nota) return
    const phone = teamPhones[s.asignadoA]
    const base = window.location.origin
    const panelUrl = `${base}/operativo`
    const msg =
      `🔄 *Solicitud con observaciones — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl revisó la solicitud:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `📝 *Observaciones:*\n${nota}\n\n` +
      `Entra a tu panel para hacer las correcciones y marcarla como lista:\n👉 ${panelUrl}`
    if (phone) abrirWA(phone, msg)
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "regresar", observaciones: nota }),
    }).then(() => { setRegresando(null); cargar() }).finally(() => setAccionando(null))
  }

  function handleRecordar(s: Solicitud) {
    const phone = teamPhones[s.asignadoA]
    if (!phone) return
    const base = window.location.origin
    const panelUrl = `${base}/operativo`
    abrirWA(phone,
      `⏰ *Recordatorio — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl pregunta por la solicitud:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `Entra a tu panel para terminarla:\n👉 ${panelUrl}`
    )
  }

  async function handleBorrar(s: Solicitud) {
    if (!confirm(`¿Borrar la solicitud #${String(s.folio).padStart(4, "0")} de ${s.clienteNombre}?\n\nEsta acción no se puede deshacer.`)) return
    setAccionando(s.id)
    await fetch(`/api/solicitudes/${s.id}`, { method: "DELETE" })
    await cargar()
    setAccionando(null)
  }

  // ── Datos filtrados ────────────────────────────────────────────────────────
  const pendientes    = solicitudes.filter((s) => s.estado === "pendiente")
  const enRevision    = solicitudes.filter((s) => s.estado === "en_revision")
  const enCurso       = solicitudes.filter((s) => s.estado === "en_curso" || s.estado === "con_observaciones")
  const listos        = solicitudes.filter((s) => s.estado === "listo")
  const alertas       = solicitudes.filter((s) => nivelAlerta(s) !== "ok" && s.estado !== "listo" && s.estado !== "en_revision")

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Despacho Contable Rodríguez</div>
            <div className="text-xs text-slate-400">Panel de control · Saúl Rodríguez</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button onClick={() => setVista("equipo")}    className={`px-3 py-1.5 transition-colors ${vista === "equipo"    ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Por persona</button>
            <button onClick={() => setVista("lista")}     className={`px-3 py-1.5 transition-colors ${vista === "lista"     ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Lista</button>
            <button onClick={() => setVista("servicios")} className={`px-3 py-1.5 transition-colors ${vista === "servicios" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Servicios</button>
            <button onClick={() => setVista("colaboradores")} className={`px-3 py-1.5 transition-colors ${vista === "colaboradores" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Equipo</button>
          </div>
          <button onClick={refrescarTodo} disabled={refrescando}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-60 disabled:no-underline">
            <svg className={`w-3.5 h-3.5 ${refrescando ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {refrescando ? "Actualizando…" : "Actualizar"}
          </button>
          <CambiarPassword />
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/") }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* Banner alertas */}
        {alertas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <div className="text-sm font-medium text-amber-800">{alertas.length} solicitud{alertas.length !== 1 ? "es" : ""} requieren atención urgente</div>
              <div className="text-xs text-amber-600 mt-0.5">{alertas.map((s) => `#${String(s.folio).padStart(4,"0")} ${s.clienteNombre}`).join(" · ")}</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Sin asignar",  val: pendientes.length,  color: pendientes.length  > 0 ? "text-red-500"   : "text-slate-800" },
            { label: "En curso",     val: enCurso.length,     color: "text-blue-600" },
            { label: "En revisión",  val: enRevision.length,  color: enRevision.length  > 0 ? "text-purple-600" : "text-slate-800" },
            { label: "Terminadas",   val: listos.length,      color: "text-green-600" },
            { label: "Con alerta",   val: alertas.length,     color: alertas.length     > 0 ? "text-amber-500" : "text-slate-800" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className={`text-3xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {loading && <div className="py-16 text-center text-sm text-slate-400">Cargando solicitudes...</div>}

        {/* ── EN REVISIÓN — prioridad máxima ── */}
        {!loading && enRevision.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-purple-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-purple-100 bg-purple-50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm font-semibold text-purple-800">En revisión — requieren tu aprobación</span>
              <span className="ml-auto bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">{enRevision.length}</span>
            </div>
            {enRevision.map((s) => (
              <div key={s.id} className="px-5 py-4 border-b border-slate-50 last:border-b-0">
                <div className="flex items-start gap-4">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${NIVEL_DOT[s.nivel]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{s.servicioNombre}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {s.clienteNombre} · Folio #{String(s.folio).padStart(4,"0")} · Terminó hace {fmtTiempo(s.actualizadoEn)} — atendido por {s.asignadoA}
                    </div>
                    <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
                    <ArchivoLink url={s.archivo2Url} nombre={s.archivo2Nombre} />

                    {/* Documentos de entrega — hasta 2 */}
                    <div className="mt-2 space-y-1.5">
                      {([1, 2] as const).map((slot) => {
                        const doc = docEntrega[s.id]
                        const nombre = slot === 1 ? doc?.nombre : doc?.nombre2
                        return nombre ? (
                          <div key={slot} className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
                            <span>📄</span>
                            <span className="truncate max-w-[200px]">{nombre}</span>
                            <button onClick={() => setDocEntrega((p) => {
                              const prev = p[s.id] ?? { url: "", nombre: "", url2: "", nombre2: "" }
                              return { ...p, [s.id]: slot === 1 ? { ...prev, url: "", nombre: "" } : { ...prev, url2: "", nombre2: "" } }
                            })} className="text-slate-400 hover:text-red-400 ml-1">✕</button>
                          </div>
                        ) : (
                          <label key={slot} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 cursor-pointer border border-dashed border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                            {subiendoDoc === s.id ? "Subiendo..." : `Archivo ${slot} de entrega (opcional)`}
                            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.xml"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirDocEntrega(s.id, f, slot) }} />
                          </label>
                        )
                      })}
                    </div>

                    {/* Área de observaciones */}
                    {regresando === s.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={2} placeholder="Escribe las observaciones para el trabajador..."
                          value={observacion[s.id] ?? ""}
                          onChange={(e) => setObservacion({ ...observacion, [s.id]: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleRegresar(s)} disabled={!observacion[s.id]?.trim() || accionando === s.id}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 font-medium disabled:opacity-40 transition-colors">
                            {accionando === s.id ? "..." : "Enviar observaciones + WA"}
                          </button>
                          <button onClick={() => setRegresando(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleAprobar(s)} disabled={accionando === s.id}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 font-medium disabled:opacity-40 transition-colors">
                          {accionando === s.id ? "..." : "✓ Aprobar y notificar cliente"}
                        </button>
                        <button onClick={() => setRegresando(s.id)}
                          className="text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl px-4 py-2 font-medium transition-colors">
                          ↩ Regresar con observaciones
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Vista por persona ── */}
        {!loading && vista === "equipo" && (
          <div className="space-y-4">
            {/* Sin asignar */}
            {pendientes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm font-semibold text-slate-700">Nuevas — sin asignar</span>
                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">{pendientes.length}</span>
                </div>
                {pendientes.map((s) => {
                  const alerta = nivelAlerta(s)
                  const permitidos = nombresEquipo
                  return (
                    <div key={s.id} className={`px-5 py-4 flex items-center gap-4 border-b border-slate-50 last:border-b-0 ${ALERTA_BG[alerta]}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="text-sm font-medium text-slate-800">{s.servicioNombre}</div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.nivel === "red" ? "bg-red-100 text-red-600" : s.nivel === "amber" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                            {s.nivel === "red" ? "Alta" : s.nivel === "amber" ? "Media" : "Rápido"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{s.clienteNombre} · #{String(s.folio).padStart(4,"0")} · hace {fmtTiempo(s.creadoEn)}</div>
                        <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
                    <ArchivoLink url={s.archivo2Url} nombre={s.archivo2Nombre} />
                      </div>
                      {alerta !== "ok" && <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ALERTA_TAG[alerta]}`}>{alerta === "vencida" ? "⚠ Vencida" : "⏱ Demorada"}</span>}
                      <select value={asignando[s.id] ?? ""} onChange={(e) => setAsignando({ ...asignando, [s.id]: e.target.value })}
                        className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none flex-shrink-0">
                        <option value="">— Asignar a —</option>
                        {permitidos.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <button onClick={() => handleAsignar(s)} disabled={!asignando[s.id] || accionando === s.id}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-medium disabled:opacity-40 transition-colors flex-shrink-0">
                        {accionando === s.id ? "..." : "Asignar + WA"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tarjetas por persona */}
            <div className="grid grid-cols-2 gap-4">
              {nombresEquipo.map((nombre) => {
                const activas    = enCurso.filter((s) => s.asignadoA === nombre)
                const terminadas = listos.filter((s) => s.asignadoA === nombre)
                const conAlerta  = activas.filter((s) => nivelAlerta(s) !== "ok")
                const initials   = nombre.split(" ").map((n) => n[0]).join("").slice(0,2)
                return (
                  <div key={nombre} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">{initials}</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{nombre}</div>
                        <div className="text-xs text-slate-400">{activas.length === 0 ? "Disponible" : `${activas.length} tarea${activas.length !== 1 ? "s" : ""} activa${activas.length !== 1 ? "s" : ""}`}</div>
                      </div>
                      {conAlerta.length > 0
                        ? <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">⚠ {conAlerta.length}</span>
                        : activas.length === 0 && <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />}
                    </div>

                    {activas.length === 0 && terminadas.length === 0 && (
                      <div className="px-5 py-6 text-center text-xs text-slate-300">Sin tareas asignadas</div>
                    )}

                    {(activas.length > 0 || terminadas.length > 0) && (
                      <div className="px-5 py-2 border-b border-slate-100 grid grid-cols-[20px_56px_1fr_1fr] gap-2">
                        <span />
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Folio</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Trabajo</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
                      </div>
                    )}

                    {activas.map((s) => {
                      const alerta = nivelAlerta(s)
                      return (
                        <div key={s.id} className={`px-5 border-b border-slate-50 ${ALERTA_BG[alerta]}`}>
                          <div className="grid grid-cols-[20px_56px_1fr_1fr] gap-2 items-center py-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${NIVEL_DOT[s.nivel]}`} />
                            <span className="text-xs font-mono text-slate-700 font-medium">#{String(s.folio).padStart(4,"0")}</span>
                            <div className="text-sm font-medium text-slate-800 truncate">
                              {s.servicioNombre}
                              {s.estado === "con_observaciones" && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">obs.</span>}
                            </div>
                            <div className="text-xs text-slate-600 truncate">{s.clienteNombre}</div>
                          </div>
                          {alerta !== "ok" && (
                            <div className="flex items-center gap-2 pb-2.5 pl-6">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ALERTA_TAG[alerta]}`}>{alerta === "vencida" ? "⚠ Vencida" : "⏱ Demorada"}</span>
                              <button onClick={() => handleRecordar(s)} className="ml-auto text-xs border border-amber-200 text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors">
                                Recordar WA
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {terminadas.slice(0,2).map((s) => (
                      <div key={s.id} className="px-5 py-2.5 border-b border-slate-50 grid grid-cols-[20px_56px_1fr_1fr] gap-2 items-center opacity-75">
                        <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-xs font-mono text-slate-600">#{String(s.folio).padStart(4,"0")}</span>
                        <div className="text-xs text-slate-600 truncate line-through">{s.servicioNombre}</div>
                        <div className="text-xs text-slate-500 truncate">{s.clienteNombre}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Vista lista ── */}
        {!loading && vista === "lista" && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[2fr_1.3fr_80px_120px_120px_160px] gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-400 uppercase tracking-wide">
              <span>Servicio</span><span>Cliente</span><span>Nivel</span><span>Asignado a</span><span>Estado</span><span>Acción</span>
            </div>
            {solicitudes.length === 0 && <div className="py-12 text-center text-sm text-slate-400">No hay solicitudes aún.</div>}
            {solicitudes.map((s) => {
              const alerta    = nivelAlerta(s)
              const permitidos = nombresEquipo
              const ESTADO_LABEL: Record<string, string> = {
                pendiente: "Nueva", en_curso: "En curso", en_revision: "En revisión",
                con_observaciones: "Con obs.", listo: "✓ Lista",
              }
              const ESTADO_COLOR: Record<string, string> = {
                pendiente: "bg-slate-100 text-slate-500", en_curso: "bg-blue-50 text-blue-600",
                en_revision: "bg-purple-50 text-purple-700", con_observaciones: "bg-amber-50 text-amber-700",
                listo: "bg-green-50 text-green-700",
              }
              const tieneArchivos = s.archivoUrl || s.archivo2Url
              return (
                <div key={s.id} className={`border-b border-slate-50 last:border-b-0 ${ALERTA_BG[alerta]}`}>
                  <div className="grid grid-cols-[2fr_1.3fr_80px_120px_120px_160px] gap-3 px-5 py-4 items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${NIVEL_DOT[s.nivel]}`} />
                      <div className="min-w-0 leading-tight">
                        <div className="text-sm font-medium text-slate-800 truncate">{s.servicioNombre}</div>
                        <div className="text-xs text-slate-400 mt-0.5">#{String(s.folio).padStart(4,"0")} · {fmtTiempo(s.creadoEn)}</div>
                      </div>
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="text-sm text-slate-700 truncate">{s.clienteNombre}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{fmtTel(s.clienteWhatsapp)}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full w-fit ${NIVEL_BADGE[s.nivel]}`}>
                      {s.nivel === "red" ? "Alta" : s.nivel === "amber" ? "Media" : "Rápido"}
                    </span>
                    {s.estado === "pendiente" ? (
                      <select value={asignando[s.id] ?? ""} onChange={(e) => setAsignando({ ...asignando, [s.id]: e.target.value })}
                        className="text-sm border border-slate-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none w-full">
                        <option value="">— Asignar —</option>
                        {permitidos.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-700 font-medium truncate">{s.asignadoA || "—"}</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full w-fit ${ESTADO_COLOR[s.estado]}`}>
                      {ESTADO_LABEL[s.estado]}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {s.estado === "pendiente" && (
                        <button onClick={() => handleAsignar(s)} disabled={!asignando[s.id] || accionando === s.id}
                          className="text-xs bg-blue-600 text-white rounded-xl px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40 transition-colors">
                          {accionando === s.id ? "..." : "Asignar + WA"}
                        </button>
                      )}
                      {s.estado === "en_revision" && (
                        <>
                          <button onClick={() => handleAprobar(s)} disabled={accionando === s.id}
                            className="text-xs bg-green-600 text-white rounded-xl px-2.5 py-1.5 hover:bg-green-700 disabled:opacity-40 transition-colors">
                            ✓ Aprobar
                          </button>
                          <button onClick={() => setRegresando(regresando === s.id ? null : s.id)}
                            className="text-xs border border-amber-300 text-amber-700 rounded-xl px-2.5 py-1.5 hover:bg-amber-50 transition-colors">
                            ↩ Obs.
                          </button>
                        </>
                      )}
                      <button onClick={() => handleBorrar(s)} disabled={accionando === s.id} title="Borrar solicitud"
                        className="text-xs border border-slate-200 text-slate-400 rounded-xl px-2 py-1.5 hover:border-red-200 hover:text-red-500 disabled:opacity-40 transition-colors">
                        🗑
                      </button>
                    </div>
                  </div>
                  {tieneArchivos && (
                    <div className="flex flex-wrap gap-2 px-5 pb-3 pl-12">
                      <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
                      <ArchivoLink url={s.archivo2Url} nombre={s.archivo2Nombre} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Vista Servicios ───────────────────────────────────────────────── */}
        {vista === "servicios" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Agregar nuevo */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Agregar servicio</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input placeholder="Nombre del servicio" value={nuevoSvc.nombre}
                  onChange={e => setNuevoSvc(p => ({ ...p, nombre: e.target.value }))}
                  className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                <input placeholder="Categoría (ej. Nómina)" value={nuevoSvc.categoria}
                  onChange={e => setNuevoSvc(p => ({ ...p, categoria: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                <select value={nuevoSvc.nivel} onChange={e => setNuevoSvc(p => ({ ...p, nivel: e.target.value as ServicioDB["nivel"] }))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400">
                  <option value="green">🟢 Trámite rápido</option>
                  <option value="amber">🟡 Complejidad media</option>
                  <option value="red">🔴 Alta complejidad</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Días hábiles:</label>
                  <input type="number" min={0} max={30} value={nuevoSvc.diasHabiles}
                    onChange={e => setNuevoSvc(p => ({ ...p, diasHabiles: Number(e.target.value) }))}
                    className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
                <button disabled={guardandoSvc || !nuevoSvc.nombre || !nuevoSvc.categoria}
                  onClick={async () => {
                    setGuardandoSvc(true)
                    await fetch("/api/servicios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nuevoSvc) })
                    setNuevoSvc({ nombre: "", categoria: "", nivel: "green", diasHabiles: 1 })
                    await cargarServicios()
                    setGuardandoSvc(false)
                  }}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  {guardandoSvc ? "Guardando…" : "+ Agregar"}
                </button>
              </div>
            </div>

            {/* Lista de servicios agrupados por categoría */}
            {[...new Set(servicios.map(s => s.categoria))].map(cat => (
              <div key={cat} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</span>
                </div>
                {servicios.filter(s => s.categoria === cat).map(s => (
                  editandoSvc === s.id ? (
                    <div key={s.id} className="px-5 py-4 border-b border-slate-50 last:border-0 bg-blue-50/40">
                      <div className="grid grid-cols-2 gap-3">
                        <input value={svcDraft.nombre} onChange={e => setSvcDraft(p => ({ ...p, nombre: e.target.value }))}
                          placeholder="Nombre del servicio"
                          className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                        <input value={svcDraft.categoria} onChange={e => setSvcDraft(p => ({ ...p, categoria: e.target.value }))}
                          placeholder="Categoría"
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                        <select value={svcDraft.nivel} onChange={e => setSvcDraft(p => ({ ...p, nivel: e.target.value as ServicioDB["nivel"] }))}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400">
                          <option value="green">🟢 Trámite rápido</option>
                          <option value="amber">🟡 Complejidad media</option>
                          <option value="red">🔴 Alta complejidad</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500 whitespace-nowrap">Días hábiles:</label>
                          <input type="number" min={0} max={30} value={svcDraft.diasHabiles}
                            onChange={e => setSvcDraft(p => ({ ...p, diasHabiles: Number(e.target.value) }))}
                            className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2 mt-1">
                          <button onClick={() => setEditandoSvc(null)}
                            className="text-xs rounded-lg px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                            Cancelar
                          </button>
                          <button disabled={guardandoEdit || !svcDraft.nombre || !svcDraft.categoria}
                            onClick={async () => {
                              setGuardandoEdit(true)
                              await fetch(`/api/servicios/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(svcDraft) })
                              await cargarServicios()
                              setEditandoSvc(null)
                              setGuardandoEdit(false)
                            }}
                            className="text-xs bg-blue-600 text-white rounded-lg px-4 py-1.5 hover:bg-blue-700 disabled:opacity-40 transition-colors">
                            {guardandoEdit ? "Guardando…" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={s.id} className={`flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 ${!s.activo ? "opacity-40" : ""}`}>
                      <span className="text-base">{s.nivel === "red" ? "🔴" : s.nivel === "amber" ? "🟡" : "🟢"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800">{s.nombre}</div>
                        <div className="text-xs text-slate-400">{s.diasHabiles === 0 ? "mismo día" : `${s.diasHabiles} día${s.diasHabiles !== 1 ? "s" : ""} hábil${s.diasHabiles !== 1 ? "es" : ""}`}</div>
                      </div>
                      <button onClick={() => { setEditandoSvc(s.id); setSvcDraft({ nombre: s.nombre, categoria: s.categoria, nivel: s.nivel, diasHabiles: s.diasHabiles }) }}
                        className="text-xs rounded-lg px-3 py-1.5 border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                        Editar
                      </button>
                      <button onClick={async () => {
                        await fetch(`/api/servicios/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !s.activo }) })
                        cargarServicios()
                      }} className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${s.activo ? "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                        {s.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Vista Colaboradores (equipo) ──────────────────────────────────── */}
        {vista === "colaboradores" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Números de WhatsApp del equipo</h2>
              <p className="text-xs text-slate-400 mb-5">A estos números llegan los avisos de asignación y recordatorios. Escríbelos con lada (ej. 667 123 4567) y presiona Guardar.</p>
              <div className="space-y-2">
                {colaboradores.map((c) => {
                  const initials = c.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)
                  const actual = editWA[c.id] ?? c.whatsapp
                  const cambiado = actual.trim() !== c.whatsapp
                  return (
                    <div key={c.id} className={`flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 ${!c.activo ? "opacity-45" : ""}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${c.rol === "saul" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>{initials}</div>
                      <div className="w-24 flex-shrink-0 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{c.nombre}</div>
                        <div className="text-[11px] text-slate-400">{c.rol === "saul" ? "Administrador" : "Colaborador"}</div>
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">+52</span>
                        <input value={actual} onChange={(e) => setEditWA((p) => ({ ...p, [c.id]: e.target.value }))}
                          placeholder="Sin número — agrégalo aquí"
                          className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-1.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
                      </div>
                      <button disabled={!cambiado || guardandoColab === c.id}
                        onClick={async () => {
                          setGuardandoColab(c.id)
                          await fetch(`/api/colaboradores/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsapp: actual.trim() }) })
                          await cargarColaboradores()
                          setEditWA((p) => { const n = { ...p }; delete n[c.id]; return n })
                          setGuardandoColab(null)
                        }}
                        className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-30 transition-colors flex-shrink-0">
                        {guardandoColab === c.id ? "…" : "Guardar"}
                      </button>
                      {c.rol !== "saul" && (
                        <button onClick={async () => {
                          await fetch(`/api/colaboradores/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !c.activo }) })
                          cargarColaboradores()
                        }} className={`text-xs rounded-lg px-2.5 py-1.5 border transition-colors flex-shrink-0 ${c.activo ? "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                          {c.activo ? "Quitar" : "Activar"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Agregar colaborador */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Agregar colaborador</h2>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={nuevoColab} onChange={(e) => setNuevoColab(e.target.value)}
                  placeholder="Nombre (ej. Laura)"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
                <input value={nuevoColabPw} onChange={(e) => setNuevoColabPw(e.target.value)}
                  placeholder="Contraseña temporal (opcional)"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
                <button disabled={!nuevoColab.trim() || guardandoColab === "nuevo"}
                  onClick={async () => {
                    setGuardandoColab("nuevo")
                    setAccesoCreado(null)
                    const r = await fetch("/api/colaboradores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nuevoColab.trim(), password: nuevoColabPw.trim() || undefined }) })
                    const data = await r.json().catch(() => ({}))
                    if (r.ok && data.usuarioCreado) setAccesoCreado(`${data.usuarioCreado}|${nuevoColabPw.trim()}`)
                    setNuevoColab(""); setNuevoColabPw("")
                    await cargarColaboradores(); await cargarUsuarios()
                    setGuardandoColab(null)
                  }}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0">
                  {guardandoColab === "nuevo" ? "Guardando…" : "+ Agregar"}
                </button>
              </div>
              {accesoCreado && (
                <div className="mt-3 text-xs bg-green-50 border border-green-100 text-green-800 rounded-xl px-3 py-2">
                  Acceso creado — usuario: <b>{accesoCreado.split("|")[0]}</b>, contraseña temporal: <b>{accesoCreado.split("|")[1]}</b>. Pásaselos; podrá cambiarla al entrar.
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">Si le pones contraseña temporal, se le crea un <b>acceso</b> para entrar a su panel; si la dejas vacía, solo se agrega para WhatsApp y asignaciones. Para sacarlo del equipo usa &quot;Quitar&quot; (no se borra su historial).</p>
            </div>

            {/* Accesos del sistema (restablecer contraseñas) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Accesos al sistema</h2>
              <p className="text-xs text-slate-400 mb-4">Si a alguien se le olvida su contraseña, escríbele una nueva aquí y pásasela. Nadie puede ver la contraseña actual (están encriptadas).</p>
              <div className="space-y-2">
                {usuarios.map((u) => {
                  const draft = resetPw[u.usuario] ?? ""
                  return (
                    <div key={u.usuario} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                      <div className="w-32 flex-shrink-0 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{u.nombre}</div>
                        <div className="text-[11px] text-slate-400">usuario: {u.usuario}{u.rol === "saul" ? " · admin" : ""}</div>
                      </div>
                      <input value={draft} onChange={(e) => setResetPw((p) => ({ ...p, [u.usuario]: e.target.value }))}
                        placeholder="Nueva contraseña (mín. 6)"
                        className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
                      <button disabled={draft.trim().length < 6 || reseteando === u.usuario}
                        onClick={async () => {
                          setReseteando(u.usuario)
                          const r = await fetch(`/api/usuarios/${u.usuario}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nueva: draft.trim() }) })
                          setReseteando(null)
                          if (r.ok) { setResetPw((p) => { const n = { ...p }; delete n[u.usuario]; return n }); alert(`Contraseña restablecida para ${u.nombre}. Pásasela: ${draft.trim()}`) }
                        }}
                        className="text-xs bg-slate-700 text-white rounded-lg px-3 py-1.5 hover:bg-slate-800 disabled:opacity-30 transition-colors flex-shrink-0">
                        {reseteando === u.usuario ? "…" : "Restablecer"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
