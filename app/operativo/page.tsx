"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Solicitud } from "@/lib/db"

function fmtTiempo(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 24) return `${Math.round(h)} hrs`
  return `${Math.round(h / 24)} días`
}

function ArchivoLink({ url, nombre }: { url: string; nombre: string }) {
  if (!url) return null
  const ext = nombre.split(".").pop()?.toLowerCase() ?? ""
  const icono = ext === "pdf" ? "📄" : ["jpg","jpeg","png"].includes(ext) ? "🖼️" : ["xls","xlsx"].includes(ext) ? "📊" : "📎"
  return (
    <a href={`/api/archivo?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 transition-colors mt-2">
      <span>{icono}</span>
      <span className="max-w-[160px] truncate">{nombre}</span>
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </a>
  )
}

const ESTADO_LABEL: Record<string, string> = {
  en_curso: "En curso", con_observaciones: "Con observaciones", en_revision: "En revisión", listo: "Completada",
}
const ESTADO_COLOR: Record<string, string> = {
  en_curso: "bg-blue-50 text-blue-600", con_observaciones: "bg-amber-50 text-amber-700",
  en_revision: "bg-purple-50 text-purple-700", listo: "bg-green-50 text-green-700",
}

export default function Operativo() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [docsTrabajo, setDocsTrabajo] = useState<Record<string, { file1: File | null; file2: File | null }>>({})
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null)
  const refs1 = useRef<Record<string, HTMLInputElement | null>>({})
  const refs2 = useRef<Record<string, HTMLInputElement | null>>({})

  const cargar = useCallback(async () => {
    const res = await fetch("/api/solicitudes")
    if (res.status === 401) { router.push("/login?ruta=operativo"); return }
    const todas: Solicitud[] = await res.json()
    const session = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null)
    if (session?.nombre) {
      setNombre(session.nombre)
      setSolicitudes(todas.filter(s => s.asignadoA === session.nombre && s.estado !== "listo"))
    }
    setLoading(false)
  }, [router])

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t) }, [cargar])

  function setDoc(id: string, slot: 1 | 2, file: File | null) {
    setDocsTrabajo(p => ({ ...p, [id]: { ...(p[id] ?? { file1: null, file2: null }), [slot === 1 ? "file1" : "file2"]: file } }))
  }

  async function marcarTerminada(s: Solicitud) {
    setMarcando(s.id)
    setSubiendoDoc(s.id)
    const docs = docsTrabajo[s.id] ?? { file1: null, file2: null }

    async function subir(f: File) {
      const fd = new FormData(); fd.append("file", f)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      if (!r.ok) throw new Error("Error al subir archivo")
      return await r.json() as { url: string; nombre: string }
    }

    const [u1, u2] = await Promise.all([
      docs.file1 ? subir(docs.file1) : Promise.resolve(null),
      docs.file2 ? subir(docs.file2) : Promise.resolve(null),
    ])
    setSubiendoDoc(null)

    const res = await fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "terminar",
        documentoUrl: u1?.url ?? "",
        documentoNombre: u1?.nombre ?? "",
        documento2Url: u2?.url ?? "",
        documento2Nombre: u2?.nombre ?? "",
      }),
    })
    const data = await res.json()
    if (data.linkSaul) window.open(data.linkSaul, "_blank")
    cargar()
    setMarcando(null)
  }

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  const activas  = solicitudes.filter(s => s.estado === "en_curso" || s.estado === "con_observaciones")
  const revision = solicitudes.filter(s => s.estado === "en_revision")

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{nombre || "Colaborador"}</div>
            <div className="text-xs text-slate-400">Despacho Contable Rodríguez</div>
          </div>
        </div>
        <button onClick={cerrarSesion} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cerrar sesión</button>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-4">

        {loading && <div className="py-16 text-center text-sm text-slate-400">Cargando tus tareas...</div>}

        {!loading && activas.length === 0 && revision.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-sm font-medium text-slate-600">Sin tareas pendientes</div>
            <div className="text-xs text-slate-400 mt-1">Saúl te avisará cuando tengas una nueva asignación</div>
          </div>
        )}

        {revision.length > 0 && (
          <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-purple-100 bg-purple-50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-sm font-semibold text-purple-800">En revisión por Saúl</span>
            </div>
            {revision.map(s => (
              <div key={s.id} className="px-5 py-4 border-b border-slate-50 last:border-b-0 opacity-60">
                <div className="text-sm font-medium text-slate-700">{s.servicioNombre}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.clienteNombre} · Folio #{String(s.folio).padStart(4,"0")}</div>
                <div className="text-xs text-purple-600 mt-1">Saúl está revisando tu trabajo antes de notificar al cliente</div>
              </div>
            ))}
          </div>
        )}

        {activas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm font-semibold text-slate-700">Mis tareas activas</span>
              <span className="ml-auto bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">{activas.length}</span>
            </div>
            {activas.map(s => {
              const docs = docsTrabajo[s.id] ?? { file1: null, file2: null }
              const ocupado = marcando === s.id
              return (
                <div key={s.id} className={`px-5 py-5 border-b border-slate-50 last:border-b-0 ${s.estado === "con_observaciones" ? "bg-amber-50" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[s.estado]}`}>{ESTADO_LABEL[s.estado]}</span>
                    <span className="text-xs text-slate-400">hace {fmtTiempo(s.actualizadoEn)}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{s.servicioNombre}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Cliente: {s.clienteNombre} · Folio #{String(s.folio).padStart(4,"0")}</div>

                  {s.notas && (
                    <div className="mt-2 bg-slate-50 rounded-xl px-3 py-2">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">Notas del cliente</div>
                      <div className="text-xs text-slate-600">{s.notas}</div>
                    </div>
                  )}
                  {s.estado === "con_observaciones" && s.observaciones && (
                    <div className="mt-2 bg-amber-100 border border-amber-200 rounded-xl px-3 py-2">
                      <div className="text-xs font-semibold text-amber-700 mb-0.5">Observaciones de Saúl</div>
                      <div className="text-xs text-amber-800">{s.observaciones}</div>
                    </div>
                  )}
                  <ArchivoLink url={s.archivoUrl} nombre={s.archivoNombre} />
                  <ArchivoLink url={s.archivo2Url} nombre={s.archivo2Nombre} />

                  {/* Subir documentos de trabajo */}
                  <div className="mt-4 border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Adjunta tu trabajo <span className="text-slate-400 font-normal">(opcional · hasta 2 archivos)</span></p>
                    {([1, 2] as const).map(slot => {
                      const file = slot === 1 ? docs.file1 : docs.file2
                      const ref = slot === 1 ? refs1 : refs2
                      return (
                        <div key={slot} onClick={() => ref.current[s.id]?.click()}
                          className={`mb-2 border-2 border-dashed rounded-xl px-3 py-3 text-center cursor-pointer transition-colors ${file ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                          {file ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">✓ {file.name}</span>
                              <button type="button" onClick={e => { e.stopPropagation(); setDoc(s.id, slot, null); if(ref.current[s.id]) ref.current[s.id]!.value = "" }}
                                className="text-slate-400 hover:text-red-400 flex-shrink-0 text-xs">✕</button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Archivo {slot} — toca para adjuntar</span>
                          )}
                          <input ref={el => { ref.current[s.id] = el }} type="file" className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={e => { const f = e.target.files?.[0]; if(f) setDoc(s.id, slot, f) }} />
                        </div>
                      )
                    })}
                  </div>

                  <button onClick={() => marcarTerminada(s)} disabled={ocupado}
                    className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
                    {subiendoDoc === s.id ? "Subiendo archivos..." : ocupado ? "Enviando aviso a Saúl..." : "✓ Marcar como terminada"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
