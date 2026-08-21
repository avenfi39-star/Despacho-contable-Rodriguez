import { NextResponse } from "next/server"
import { listarSolicitudes, getTelefonoSaul } from "@/lib/db"
import { ALERTA_SIN_ASIGNAR_HRS, ALERTA_RETRASO_DIAS } from "@/lib/catalog"

// Este endpoint es llamado por Vercel Cron cada hora.
// Revisa solicitudes vencidas y construye links de WA para que Saúl los abra.

function horasDesde(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 36e5
}

export async function GET(req: Request) {
  // Protección básica: solo Vercel Cron puede llamar esto
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const todas = await listarSolicitudes()
  const saulPhone = await getTelefonoSaul()
  const alertas: string[] = []

  for (const s of todas) {
    if (s.estado === "listo") continue

    if (s.estado === "pendiente") {
      const umbralHrs = ALERTA_SIN_ASIGNAR_HRS[s.nivel]
      const hrs = horasDesde(s.creadoEn)
      if (hrs >= umbralHrs) {
        alertas.push(
          `⚠️ Folio #${String(s.folio).padStart(4,"0")} — ${s.servicioNombre} (${s.clienteNombre}) lleva ${Math.round(hrs)} hrs SIN ASIGNAR.`
        )
      }
    }

    if (s.estado === "en_curso") {
      const umbralDias = ALERTA_RETRASO_DIAS[s.nivel]
      const dias = horasDesde(s.actualizadoEn) / 24
      if (dias >= umbralDias) {
        alertas.push(
          `⏱️ Folio #${String(s.folio).padStart(4,"0")} — ${s.servicioNombre} (${s.clienteNombre}) asignado a ${s.asignadoA} lleva ${Math.round(dias * 10) / 10} días EN CURSO sin cerrar.`
        )
      }
    }
  }

  if (alertas.length > 0 && saulPhone) {
    const msg =
      `🔔 *Reporte de alertas — Despacho Rodríguez*\n\n` +
      alertas.join("\n\n") +
      `\n\nEntra al dashboard para atender estas solicitudes.`

    const waUrl = `https://api.whatsapp.com/send?phone=${saulPhone}&text=${encodeURIComponent(msg)}`
    // En producción aquí se enviaría via API de WhatsApp Business.
    // Por ahora retornamos el link para que Saúl lo abra manualmente desde el dashboard.
    return NextResponse.json({ alertas, waUrl })
  }

  return NextResponse.json({ alertas: [], mensaje: "Sin alertas pendientes" })
}
