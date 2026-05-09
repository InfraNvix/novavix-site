import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCopsoqGroupAggregate } from '@/lib/copsoq/services/group-aggregate'
import { getCopsoqIndividualProfile } from '@/lib/copsoq/services/get-individual-profile'
import { getCopsoqMinRespondentsThreshold } from '@/lib/copsoq/auth/access'
import { getSupabaseServerClient } from '@/lib/supabase/server'

function startOfMonthISO(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function endOfMonthISO(date: Date): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const last = new Date(Date.UTC(year, month + 1, 0))
  const y = last.getUTCFullYear()
  const m = String(last.getUTCMonth() + 1).padStart(2, '0')
  const d = String(last.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type UserProfileRow = {
  role: string
  company_id: string | null
  is_active: boolean
}

type PageSearchParams = {
  companyId?: string | string[]
  periodStart?: string | string[]
  periodEnd?: string | string[]
  setorNome?: string | string[]
  gheNome?: string | string[]
  sessionId?: string | string[]
}

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

function isDateYYYYMMDD(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getClassificationTextColor(classification: string): string {
  if (classification === 'critico') {
    return '#be123c'
  }
  if (classification === 'medio_alerta') {
    return '#b45309'
  }
  return '#047857'
}

function buildRadarPolygonPoints(values: number[], center: number, radius: number): string {
  const total = values.length
  if (total === 0) {
    return ''
  }

  const points = values.map((value, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const normalized = Math.max(0, Math.min(100, value)) / 100
    const x = center + Math.cos(angle) * radius * normalized
    const y = center + Math.sin(angle) * radius * normalized
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return points.join(' ')
}

function buildRadarAxisEndPoints(total: number, center: number, radius: number): Array<{ x: number; y: number }> {
  if (total <= 0) {
    return []
  }

  return Array.from({ length: total }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    }
  })
}

export default async function DashboardCopsoqPage({
  searchParams,
}: {
  searchParams?: PageSearchParams
}) {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('role, company_id, is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileData as UserProfileRow | null

  if (!profile || !profile.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">COPSOQ Coletivo</h1>
          <p className="text-sm text-slate-600 mt-3">Perfil sem empresa vinculada para visualizacao agregada.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para dashboard
          </Link>
        </section>
      </main>
    )
  }

  const now = new Date()
  const queryCompanyId = getSingleValue(searchParams?.companyId)?.trim() ?? ''
  const periodStartInput = getSingleValue(searchParams?.periodStart)?.trim() ?? ''
  const periodEndInput = getSingleValue(searchParams?.periodEnd)?.trim() ?? ''
  const sessionIdInput = getSingleValue(searchParams?.sessionId)?.trim() ?? ''
  const setorNome = getSingleValue(searchParams?.setorNome)?.trim() || null
  const gheNome = getSingleValue(searchParams?.gheNome)?.trim() || null

  const isTechnical = profile.role === 'admin' || profile.role === 'tecnico'
  const companyId = profile.company_id ?? (isTechnical && queryCompanyId ? queryCompanyId : null)

  if (!companyId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-5xl mx-auto bg-white border border-amber-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">COPSOQ Coletivo</h1>
          <p className="text-sm text-slate-700 mt-3">
            Perfil tecnico sem empresa vinculada. Informe <span className="font-bold">companyId</span> na URL para consultar.
          </p>
          <p className="text-xs text-slate-500 mt-2">Exemplo: /dashboard/copsoq?companyId=UUID_DA_EMPRESA</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para dashboard
          </Link>
        </section>
      </main>
    )
  }

  const periodStart = isDateYYYYMMDD(periodStartInput) ? periodStartInput : startOfMonthISO(now)
  const periodEnd = isDateYYYYMMDD(periodEndInput) ? periodEndInput : endOfMonthISO(now)

  let aggregate = null
  try {
    aggregate = await getCopsoqGroupAggregate(
      {
        questionnaireCode: 'copsoq_ii_short_v1_br',
        companyId,
        periodStart,
        periodEnd,
        setorId: null,
        setorNome,
        gheId: null,
        gheNome,
      },
      {
        technicalView: isTechnical,
        minRespondents: getCopsoqMinRespondentsThreshold(),
      }
    )
  } catch {
    aggregate = null
  }

  let individualProfile = null
  if (isTechnical && sessionIdInput.length > 0) {
    try {
      individualProfile = await getCopsoqIndividualProfile(sessionIdInput)
    } catch {
      individualProfile = null
    }
  }

  const radarValues = individualProfile?.radar.map((item) => item.value) ?? []
  const radarAxes = buildRadarAxisEndPoints(radarValues.length, 120, 90)
  const radarPolygon = buildRadarPolygonPoints(radarValues, 120, 90)

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-black">COPSOQ II - Visao Coletiva</p>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Medias por Dimensao</h1>
          <p className="text-sm text-slate-600 mt-2">
            Periodo de referencia: {periodStart} ate {periodEnd}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Regra de confidencialidade: exibicao agregada com minimo de {getCopsoqMinRespondentsThreshold()} respondentes.
          </p>
          <form method="GET" className="mt-5 grid md:grid-cols-3 gap-3">
            {isTechnical ? (
              <input
                name="companyId"
                defaultValue={companyId}
                placeholder="companyId (tecnico)"
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            ) : null}
            <input
              type="date"
              name="periodStart"
              defaultValue={periodStart}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              type="date"
              name="periodEnd"
              defaultValue={periodEnd}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              name="setorNome"
              defaultValue={setorNome ?? ''}
              placeholder="Filtro Setor (nome exato)"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              name="gheNome"
              defaultValue={gheNome ?? ''}
              placeholder="Filtro GHE (nome exato)"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            {isTechnical ? (
              <input
                name="sessionId"
                defaultValue={sessionIdInput}
                placeholder="sessionId para perfil individual"
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            ) : null}
            <button
              type="submit"
              className="md:col-span-3 w-full md:w-auto px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold"
            >
              Aplicar filtros
            </button>
          </form>
        </header>

        {!aggregate ? (
          <article className="bg-white border border-rose-200 rounded-2xl p-6 text-rose-700 text-sm font-medium">
            Nao foi possivel carregar os dados agregados COPSOQ para este periodo.
          </article>
        ) : (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <article className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-slate-500">Respondentes</p>
                <p className="text-3xl font-black text-slate-900 mt-2">{aggregate.respondentCountTotal}</p>
              </article>
              <article className="bg-white border border-emerald-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-emerald-700">Dimensoes Saudaveis</p>
                <p className="text-3xl font-black text-emerald-700 mt-2">{aggregate.summary.saudavel}</p>
              </article>
              <article className="bg-white border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-amber-700">Dimensoes em Alerta</p>
                <p className="text-3xl font-black text-amber-700 mt-2">{aggregate.summary.medioAlerta}</p>
              </article>
              <article className="bg-white border border-rose-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-rose-700">Dimensoes Criticas</p>
                <p className="text-3xl font-black text-rose-700 mt-2">{aggregate.summary.critico}</p>
              </article>
            </section>

            {aggregate.privacy.masked ? (
              <article className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 text-sm font-medium">
                {aggregate.privacy.reason}
              </article>
            ) : (
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">Consolidado por Dimensao</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="text-left px-4 py-3">Dimensao</th>
                        <th className="text-left px-4 py-3">Media</th>
                        <th className="text-left px-4 py-3">Classificacao</th>
                        <th className="text-left px-4 py-3">Respondentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregate.dimensions.map((item) => (
                        <tr key={item.dimensionCode} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.dimensionName}</td>
                          <td className="px-4 py-3 text-slate-700">{item.meanScore}</td>
                          <td className="px-4 py-3 text-slate-700">{item.classificationLabel}</td>
                          <td className="px-4 py-3 text-slate-700">{item.respondentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {isTechnical ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-black">COPSOQ II - Visao Individual</p>
            <h2 className="text-xl font-black text-slate-900 mt-2">Perfil Psicossocial e Radar</h2>
            {!sessionIdInput ? (
              <p className="text-sm text-slate-600 mt-3">
                Informe o <span className="font-bold">sessionId</span> no filtro acima para carregar o radar individual.
              </p>
            ) : !individualProfile ? (
              <p className="text-sm text-rose-700 mt-3">
                Sessao nao encontrada ou sem permissao para consulta individual.
              </p>
            ) : (
              <div className="mt-4 grid lg:grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">Radar 0-100</p>
                  <svg viewBox="0 0 240 240" className="w-full max-w-[380px] mt-3">
                    <circle cx="120" cy="120" r="90" fill="none" stroke="#e2e8f0" />
                    <circle cx="120" cy="120" r="60" fill="none" stroke="#e2e8f0" />
                    <circle cx="120" cy="120" r="30" fill="none" stroke="#e2e8f0" />
                    {radarAxes.map((axis, index) => (
                      <line key={index} x1="120" y1="120" x2={axis.x} y2={axis.y} stroke="#cbd5e1" />
                    ))}
                    {radarPolygon ? (
                      <polygon points={radarPolygon} fill="rgba(30, 58, 95, 0.25)" stroke="#1e3a5f" strokeWidth="2" />
                    ) : null}
                  </svg>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">Diagnostico Automatico</p>
                  <p className="text-sm text-slate-600 mt-2">
                    Colaborador: {individualProfile.collaborator.fullName ?? 'Nao informado'} | Setor:{' '}
                    {individualProfile.collaborator.setorNome ?? '-'} | GHE: {individualProfile.collaborator.gheNome ?? '-'}
                  </p>
                  <div className="mt-4 space-y-2">
                    {individualProfile.dimensions.map((item) => (
                      <div key={item.dimensionCode} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.dimensionName}</p>
                        <p className="text-sm mt-1" style={{ color: getClassificationTextColor(item.classification) }}>
                          Score {item.score} - {item.classificationLabel}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  )
}





