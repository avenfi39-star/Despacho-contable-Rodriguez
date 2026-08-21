"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { NIVEL_TIEMPO } from "@/lib/catalog"
import type { ServicioDB } from "@/lib/db"

export default function FormularioCliente() {
  const [form, setForm] = useState({ clienteNombre: "", clienteWhatsapp: "", servicioId: "", notas: "" })
  const [archivos, setArchivos] = useState<(File | null)[]>([null, null])
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [folio, setFolio] = useState<number | null>(null)
  const [linkWA, setLinkWA] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<ServicioDB[]>([])
  const inputArchivo1 = useRef<HTMLInputElement>(null)
  const inputArchivo2 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/servicios?activos=1").then(r => r.json()).then(setCatalogo)
  }, [])

  const categorias = [...new Set(catalogo.map(s => s.categoria))]
  const servicio = catalogo.find((s) => s.id === form.servicioId)

  function handleArchivo(idx: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setErrorMsg("Cada archivo no puede superar 10 MB"); return }
    setErrorMsg("")
    setArchivos(prev => { const n = [...prev]; n[idx] = f; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEstado("enviando")
    setErrorMsg("")
    try {
      async function subirArchivo(f: File) {
        const fd = new FormData(); fd.append("file", f)
        const r = await fetch("/api/upload", { method: "POST", body: fd })
        if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? "Error al subir archivo") }
        return await r.json() as { url: string; nombre: string }
      }
      const [u1, u2] = await Promise.all([
        archivos[0] ? subirArchivo(archivos[0]) : null,
        archivos[1] ? subirArchivo(archivos[1]) : null,
      ])
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, // clienteWhatsapp va tal cual; el servidor lo normaliza (blindaje)
          archivoUrl: u1?.url ?? "", archivoNombre: u1?.nombre ?? "",
          archivo2Url: u2?.url ?? "", archivo2Nombre: u2?.nombre ?? "",
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFolio(data.folio)
      if (data.linkCliente) window.open(data.linkCliente, "_blank")
      setLinkWA(data.linkCliente ?? null)
      setEstado("ok")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo.")
      setEstado("error")
    }
  }

  if (estado === "ok") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-2">¡Solicitud recibida!</h1>
          <p className="text-slate-400 text-sm mb-1">Tu número de seguimiento es</p>
          <div className="text-3xl font-bold text-blue-600 mb-5">#{String(folio).padStart(4, "0")}</div>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Nuestro equipo revisará tu solicitud y te contactará a la brevedad.<br />
            Guarda este número para cualquier consulta.
          </p>
          {linkWA && (
            <a href={linkWA} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Abrir confirmación en WhatsApp
            </a>
          )}
          <div>
            <button onClick={() => { setEstado("idle"); setForm({ clienteNombre: "", clienteWhatsapp: "", servicioId: "", notas: "" }); setArchivos([null, null]) }}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Enviar otra solicitud →
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl px-3 py-1.5 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Regresar al inicio
          </Link>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Despacho Contable Rodríguez</h1>
          <p className="text-slate-400 text-sm mt-1">Envía tu solicitud y te atendemos a la brevedad</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo o empresa</label>
              <input type="text" required placeholder="Ej. Farmacia Reyes / Juan López"
                value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp (con lada)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+52</span>
                <input type="tel" required placeholder="667 123 4567"
                  value={form.clienteWhatsapp} onChange={(e) => setForm({ ...form, clienteWhatsapp: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Recibirás la confirmación en este número</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">¿Qué servicio necesitas?</label>
              <select required value={form.servicioId} onChange={(e) => setForm({ ...form, servicioId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white transition-colors appearance-none">
                <option value="">— Selecciona un servicio —</option>
                {categorias.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {catalogo.filter((s) => s.categoria === cat).map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {servicio && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Tiempo estimado: <span className="font-medium text-slate-600">{NIVEL_TIEMPO[servicio.nivel]}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas adicionales <span className="text-slate-300 font-normal">(opcional)</span></label>
              <textarea rows={3} placeholder="Período fiscal, número de trabajadores, observaciones..."
                value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Documentos <span className="text-slate-300 font-normal">(opcional · máx. 2 archivos)</span></label>
              <div className="space-y-2">
                {([0, 1] as const).map((idx) => {
                  const ref = idx === 0 ? inputArchivo1 : inputArchivo2
                  const f = archivos[idx]
                  return (
                    <div key={idx} onClick={() => ref.current?.click()}
                      className={`border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-colors ${f ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}>
                      {f ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-sm text-blue-700 font-medium truncate max-w-[220px]">{f.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setArchivos(prev => { const n=[...prev]; n[idx]=null; return n }); if(ref.current) ref.current.value="" }} className="text-slate-400 hover:text-red-400 ml-1 flex-shrink-0">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                          <span className="text-sm">Archivo {idx + 1} — toca para adjuntar</span>
                        </div>
                      )}
                      <input ref={ref} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => handleArchivo(idx, e)} />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-300 mt-1.5">PDF, Word, Excel, imagen · máx. 10 MB por archivo</p>
            </div>
            {(estado === "error" || errorMsg) && <p className="text-sm text-red-500 text-center">{errorMsg || "Ocurrió un error. Intenta de nuevo."}</p>}
            <button type="submit" disabled={estado === "enviando"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors">
              {estado === "enviando" ? "Enviando solicitud..." : "Enviar solicitud"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Tu información es confidencial y se usa únicamente para atender tu solicitud.</p>
      </div>
    </main>
  )
}
