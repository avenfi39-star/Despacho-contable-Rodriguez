"use client"
import { useState } from "react"

type Color = "purple" | "green"

export default function CambiarPassword({ color = "purple" }: { color?: Color }) {
  const [open, setOpen] = useState(false)
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok">("idle")
  const [error, setError] = useState("")

  const acento = color === "green"
    ? { btn: "bg-green-600 hover:bg-green-700", ring: "focus:ring-green-100 focus:border-green-400" }
    : { btn: "bg-purple-600 hover:bg-purple-700", ring: "focus:ring-purple-100 focus:border-purple-400" }

  function cerrar() {
    setOpen(false); setActual(""); setNueva(""); setConfirmar(""); setEstado("idle"); setError("")
  }

  async function guardar() {
    setError("")
    if (nueva !== confirmar) { setError("Las contraseñas nuevas no coinciden"); return }
    if (nueva.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres"); return }
    setEstado("guardando")
    const r = await fetch("/api/auth/password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) { setError(data.error ?? "No se pudo cambiar la contraseña"); setEstado("idle"); return }
    setEstado("ok")
    setTimeout(cerrar, 1400)
  }

  const inputCls = `w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 ${acento.ring} transition-colors`

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
        Cambiar contraseña
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={cerrar}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Cambiar contraseña</h3>
              <button onClick={cerrar} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {estado === "ok" ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm text-slate-600">Contraseña actualizada</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña actual</label>
                  <input type="password" autoComplete="current-password" value={actual}
                    onChange={(e) => setActual(e.target.value)} className={inputCls} placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nueva contraseña</label>
                  <input type="password" autoComplete="new-password" value={nueva}
                    onChange={(e) => setNueva(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar nueva contraseña</label>
                  <input type="password" autoComplete="new-password" value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)} className={inputCls} placeholder="Repite la nueva contraseña" />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cerrar} className="text-xs rounded-xl px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={guardar} disabled={estado === "guardando" || !actual || !nueva || !confirmar}
                    className={`text-xs text-white rounded-xl px-4 py-2 disabled:opacity-40 transition-colors ${acento.btn}`}>
                    {estado === "guardando" ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
