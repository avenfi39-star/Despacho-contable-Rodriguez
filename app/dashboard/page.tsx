"use client"
import { useEffect, useState, useCallback } from "react"
import { Solicitud } from "@/lib/db"
import { CATALOGO, EQUIPO, NIVEL_LABEL, ALERTA_SIN_ASIGNAR_HRS, ALERTA_RETRASO_DIAS } from "@/lib/catalog"

const TEAM_PHONES: Record<string, string> = {
  "Beatriz":    "526671399418",
  "Trabajador": "526671399418",
  "Ana Karen":  "526671399418",
  "Santiago":   "526671399418",
}
const SAUL_PHONE = "526671399418"

function waLink(phone: string, msg: string) {
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
}
function abrirWA(phone: string, msg: string) { window.open(waLink(phone, msg), "_blank") }

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

const EQUIPO_NOMBRES = EQUIPO.map((e) => e.nombre)

function ArchivoLink({ url, nombre }: { url: string; nombre: string }) {
  if (!url) return null
  const ext = nombre.split(".").pop()?.toLowerCase() ?? ""
  const icono = ext === "pdf" ? "📄" : ["jpg","jpeg","png"].includes(ext) ? "🖼️" : ["xls","xlsx"].includes(ext) ? "📊" : "📎"
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg px-2.5 py-1 transition-colors mt-2">
      <span>{icono}</span>
      <span className="max-w-[180px] truncate">{nombre}</span>
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </a>
  )
}

export default function Dashboard() {
  const [solicitudes, setSolicitudes]   = useState<Solicitud[]>([])
  const [loading, setLoading]           = useState(true)
  const [asignando, setAsignando]       = useState<Record<string, string>>({})
  const [accionando, setAccionando]     = useState<string | null>(null)
  const [observacion, setObservacion]   = useState<Record<string, string>>({})
  const [regresando, setRegresando]     = useState<string | null>(null)
  const [vista, setVista]               = useState<"equipo" | "lista">("equipo")

  const cargar = useCallback(async () => {
    const r = await fetch("/api/solicitudes")
    setSolicitudes(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t) }, [cargar])

  // ── Acciones ──────────────────────────────────────────────────────────────

  function handleAsignar(s: Solicitud) {
    const persona = asignando[s.id]
    if (!persona) return
    const phone = TEAM_PHONES[persona]
    const base = window.location.origin
    const listoUrl = `${base}/listo/${String(s.folio).padStart(4, "0")}`
    const msg =
      `📌 *Nueva tarea asignada — Despacho Rodríguez*\n\n` +
      `Hola *${persona}*, tienes una solicitud nueva:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n` +
      `⏱ Nivel: ${NIVEL_LABEL[s.nivel]}\n` +
      (s.notas ? `\n📝 Notas: ${s.notas}\n` : "") +
      `\nCuando termines, marca la solicitud como lista aquí:\n👉 ${listoUrl}\n\n` +
      `Saúl revisará antes de notificar al cliente.`
    if (phone) abrirWA(phone, msg)
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "asignar", asignadoA: persona }),
    }).then(() => { setAsignando((p) => { const n = { ...p }; delete n[s.id]; return n }); cargar() })
      .finally(() => setAccionando(null))
  }

  function handleAprobar(s: Solicitud) {
    abrirWA(s.clienteWhatsapp,
      `✅ *Tu trámite está listo — Despacho Rodríguez*\n\n` +
      `Hola, tu solicitud ha sido completada y revisada:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `Comunícate con nosotros para recibir tu documentación. ¡Gracias!`
    )
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    }).then(() => cargar()).finally(() => setAccionando(null))
  }

  function handleRegresar(s: Solicitud) {
    const nota = observacion[s.id]?.trim()
    if (!nota) return
    const phone = TEAM_PHONES[s.asignadoA]
    const base = window.location.origin
    const listoUrl = `${base}/listo/${String(s.folio).padStart(4, "0")}`
    const msg =
      `🔄 *Solicitud con observaciones — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl revisó la solicitud:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `📝 *Observaciones:*\n${nota}\n\n` +
      `Cuando hagas las correcciones, marca como listo aquí:\n👉 ${listoUrl}`
    if (phone) abrirWA(phone, msg)
    setAccionando(s.id)
    fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "regresar", observaciones: nota }),
    }).then(() => { setRegresando(null); cargar() }).finally(() => setAccionando(null))
  }

  function handleRecordar(s: Solicitud) {
    const phone = TEAM_PHONES[s.asignadoA]
    if (!phone) return
    const base = window.location.origin
    const listoUrl = `${base}/listo/${String(s.folio).padStart(4, "0")}`
    abrirWA(phone,
      `⏰ *Recordatorio — Despacho Rodríguez*\n\n` +
      `Hola *${s.asignadoA}*, Saúl pregunta por la solicitud:\n\n` +
      `📋 *${s.servicioNombre}*\n` +
      `👤 Cliente: ${s.clienteNombre}\n` +
      `🔖 Folio: #${String(s.folio).padStart(4, "0")}\n\n` +
      `Cuando termines, marca como listo aquí:\n👉 ${listoUrl}`
    )
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
            <div className="text-xs text-slate-400">Panel de control · Saúl González</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button onClick={() => setVista("equipo")} className={`px-3 py-1.5 transition-colors ${vista === "equipo" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Por persona</button>
            <button onClick={() => setVista("lista")}  className={`px-3 py-1.5 transition-colors ${vista === "lista"  ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Lista</button>
          </div>
          <button onClick={cargar} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Actualizar
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
                  const permitidos = CATALOGO.find((c) => c.id === s.servicioId)?.asignadosPermitidos ?? EQUIPO_NOMBRES
                  return (
                    <div key={s.id} className={`px-5 py-4 flex items-center gap-4 border-b border-slate-50 last:border-b-0 ${ALERTA_BG[alerta]}`}>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${NIVEL_DOT[s.nivel]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{s.servicioNombre}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.clienteNombre} · #{String(s.folio).padStart(4,"0")} · hace {fmtTiempo(s.creadoEn)}</div>
                        <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
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
              {EQUIPO_NOMBRES.map((nombre) => {
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

                    {activas.map((s) => {
                      const alerta = nivelAlerta(s)
                      return (
                        <div key={s.id} className={`px-5 py-3.5 border-b border-slate-50 ${ALERTA_BG[alerta]}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${NIVEL_DOT[s.nivel]}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{s.servicioNombre}</div>
                              <div className="text-xs text-slate-400">
                                {s.clienteNombre} · {fmtTiempo(s.actualizadoEn)}
                                {s.estado === "con_observaciones" && <span className="ml-1 text-amber-600 font-medium">· con observaciones</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-5">
                            {alerta !== "ok" && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ALERTA_TAG[alerta]}`}>{alerta === "vencida" ? "⚠ Vencida" : "⏱ Demorada"}</span>}
                            {alerta !== "ok" && (
                              <button onClick={() => handleRecordar(s)} className="ml-auto text-xs border border-amber-200 text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors">
                                Recordar WA
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {terminadas.slice(0,2).map((s) => (
                      <div key={s.id} className="px-5 py-2.5 border-b border-slate-50 flex items-center gap-3 opacity-35">
                        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <div className="text-xs text-slate-500 truncate line-through">{s.servicioNombre}</div>
                        <div className="text-xs text-slate-400 ml-auto">{s.clienteNombre}</div>
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
              const permitidos = CATALOGO.find((c) => c.id === s.servicioId)?.asignadosPermitidos ?? EQUIPO_NOMBRES
              const ESTADO_LABEL: Record<string, string> = {
                pendiente: "Nueva", en_curso: "En curso", en_revision: "En revisión",
                con_observaciones: "Con obs.", listo: "✓ Lista",
              }
              const ESTADO_COLOR: Record<string, string> = {
                pendiente: "bg-slate-100 text-slate-500", en_curso: "bg-blue-50 text-blue-600",
                en_revision: "bg-purple-50 text-purple-700", con_observaciones: "bg-amber-50 text-amber-700",
                listo: "bg-green-50 text-green-700",
              }
              return (
                <div key={s.id} className={`grid grid-cols-[2fr_1.3fr_80px_120px_120px_160px] gap-3 px-5 py-4 border-b border-slate-50 items-center last:border-b-0 ${ALERTA_BG[alerta]}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${NIVEL_DOT[s.nivel]}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{s.servicioNombre}</div>
                      <div className="text-xs text-slate-400">#{String(s.folio).padStart(4,"0")} · {fmtTiempo(s.creadoEn)}</div>
                      <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 truncate">{s.clienteNombre}</div>
                    <div className="text-xs text-slate-400">{s.clienteWhatsapp}</div>
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
                    <span className="text-sm text-slate-700 font-medium">{s.asignadoA || "—"}</span>
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
                    {s.estado === "listo" && <span className="text-xs text-slate-300">—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
