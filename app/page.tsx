import Link from "next/link"

export default function Inicio() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-100">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Despacho Contable Rodríguez</h1>
          <p className="text-slate-400 text-sm mt-2">¿Cómo deseas continuar?</p>
        </div>

        {/* Opciones */}
        <div className="space-y-3">

          {/* Cliente */}
          <Link href="/solicitud"
            className="flex items-center gap-4 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl p-5 transition-all group shadow-sm">
            <div className="w-11 h-11 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Soy cliente</div>
              <div className="text-xs text-slate-400 mt-0.5">Envía una nueva solicitud de servicio</div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Colaborador */}
          <Link href="/login?ruta=operativo"
            className="flex items-center gap-4 bg-white hover:bg-green-50 border border-slate-100 hover:border-green-200 rounded-2xl p-5 transition-all group shadow-sm">
            <div className="w-11 h-11 bg-green-50 group-hover:bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Acceso colaboradores</div>
              <div className="text-xs text-slate-400 mt-0.5">Ver y gestionar mis tareas asignadas</div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Dirección */}
          <Link href="/login?ruta=dashboard"
            className="flex items-center gap-4 bg-white hover:bg-purple-50 border border-slate-100 hover:border-purple-200 rounded-2xl p-5 transition-all group shadow-sm">
            <div className="w-11 h-11 bg-purple-50 group-hover:bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Panel de dirección</div>
              <div className="text-xs text-slate-400 mt-0.5">Gestión completa del despacho</div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

        </div>

        <p className="text-center text-xs text-slate-300 mt-8">
          Despacho Contable Rodríguez · Sistema de gestión interno
        </p>
      </div>
    </main>
  )
}
