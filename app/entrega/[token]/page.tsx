import { listarSolicitudes } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function PaginaEntrega({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const todas = await listarSolicitudes()
  const s = todas.find((x) => x.entregaToken === token && x.entregaToken !== "")

  if (!s || !s.documentoUrl) notFound()

  const ext = s.documentoNombre.split(".").pop()?.toLowerCase() ?? ""
  const icono = ext === "pdf" ? "📄" : ["jpg","jpeg","png"].includes(ext) ? "🖼️" : ["xls","xlsx"].includes(ext) ? "📊" : "📎"

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-slate-400">Despacho Contable Rodríguez</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mb-1">Tu documento está listo</h1>
          <p className="text-xs text-slate-400 mb-1">Folio #{String(s.folio).padStart(4, "0")}</p>
          <p className="text-sm text-slate-500 mb-6">{s.servicioNombre}</p>

          <a href={`/api/entrega/${token}`}
            className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl px-5 py-4 transition-colors mb-3 text-left">
            <span className="text-2xl">{icono}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-blue-800 truncate">{s.documentoNombre}</div>
              <div className="text-xs text-blue-500">Toca para descargar</div>
            </div>
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>

          <p className="text-xs text-slate-300 mt-4">
            Este enlace es exclusivo para ti · Despacho Contable Rodríguez
          </p>
        </div>
      </div>
    </main>
  )
}
