"use client"
import { useEffect, useState } from "react"
import { Solicitud } from "@/lib/db"

export default function PaginaListo({ params }: { params: Promise<{ folio: string }> }) {
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [estado, setEstado] = useState<"cargando" | "listo_para_marcar" | "ya_terminada" | "enviando" | "ok" | "error">("cargando")
  const [folio, setFolio] = useState("")

  useEffect(() => {
    params.then(({ folio: f }) => {
      setFolio(f)
      fetch("/api/solicitudes")
        .then((r) => r.json())
        .then((todas: Solicitud[]) => {
          const found = todas.find((s) => String(s.folio).padStart(4, "0") === f)
          if (!found) { setEstado("error"); return }
          setSolicitud(found)
          if (found.estado === "en_curso" || found.estado === "con_observaciones") {
            setEstado("listo_para_marcar")
          } else {
            setEstado("ya_terminada")
          }
        })
    })
  }, [params])

  async function marcarListo() {
    if (!solicitud) return
    setEstado("enviando")
    const res = await fetch(`/api/solicitudes/${solicitud.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "terminar" }),
    })
    const data = await res.json()
    if (data.linkSaul) window.open(data.linkSaul, "_blank")
    setEstado("ok")
  }

  const NIVEL_TEXTO: Record<string, string> = {
    red: "Alta complejidad", amber: "Complejidad media", green: "Trámite rápido",
  }
  const NIVEL_COLOR: Record<string, string> = {
    red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", green: "bg-green-50 text-green-700",
  }

  if (estado === "cargando") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-400">Cargando solicitud...</div>
      </main>
    )
  }

  if (estado === "error") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Solicitud no encontrada</h1>
          <p className="text-sm text-slate-400">Verifica que el folio #{folio} sea correcto.</p>
        </div>
      </main>
    )
  }

  if (estado === "ok") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">¡Listo!</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Saúl recibió aviso para revisar el trabajo antes de notificar al cliente.
          </p>
        </div>
      </main>
    )
  }

  if (estado === "ya_terminada") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Esta solicitud ya fue marcada</h1>
          <p className="text-sm text-slate-400">
            Folio #{folio} · Estado actual: <span className="font-medium">{solicitud?.estado}</span>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl mb-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-slate-400">Despacho Contable Rodríguez</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-7">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Folio #{folio}</span>
              {solicitud && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_COLOR[solicitud.nivel]}`}>
                  {NIVEL_TEXTO[solicitud.nivel]}
                </span>
              )}
            </div>
            <h1 className="text-lg font-semibold text-slate-800 leading-snug">{solicitud?.servicioNombre}</h1>
            <p className="text-sm text-slate-400 mt-1">Cliente: {solicitud?.clienteNombre}</p>
          </div>

          {/* Observaciones de Saúl si regresó el trabajo */}
          {solicitud?.estado === "con_observaciones" && solicitud.observaciones && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-amber-700 mb-1">Observaciones de Saúl</p>
              <p className="text-sm text-amber-800 leading-relaxed">{solicitud.observaciones}</p>
            </div>
          )}

          {solicitud?.notas && (
            <div className="bg-slate-50 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-slate-500 mb-1">Notas del cliente</p>
              <p className="text-sm text-slate-600 leading-relaxed">{solicitud.notas}</p>
            </div>
          )}

          <button
            onClick={marcarListo}
            disabled={estado === "enviando"}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl py-4 text-sm font-semibold transition-colors"
          >
            {estado === "enviando" ? "Enviando aviso a Saúl..." : "✓ Marcar como terminada"}
          </button>

          <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
            Saúl revisará el trabajo antes de notificar al cliente
          </p>
        </div>
      </div>
    </main>
  )
}
