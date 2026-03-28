import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DEMO_MODE_ENABLED, DEMO_COMPANIES } from '@/lib/auth/demo'
import {
  getAnalyticsBenchmark,
  getAnalyticsDistribution,
  getAnalyticsDrilldown,
  getAnalyticsOverview,
  getAnalyticsTimeseries,
} from '@/lib/analytics/services/analytics-service'

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
}

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function startOfMonthISO(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function endOfMonthISO(date: Date): string {
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
  return `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`
}

function classificationLabel(value: 'saudavel' | 'medio_alerta' | 'critico'): string {
  if (value === 'critico') return 'Critico'
  if (value === 'medio_alerta') return 'Alerta'
  return 'Saudavel'
}

function scoreClass(score: number): string {
  if (score >= 75) return 'text-rose-300'
  if (score >= 26) return 'text-amber-300'
  return 'text-emerald-300'
}

function barClass(score: number): string {
  if (score >= 75) return 'bg-rose-500'
  if (score >= 26) return 'bg-amber-400'
  return 'bg-emerald-500'
}

function buildLinePath(values: number[], width: number, height: number, min = 0, max = 100): string {
  if (values.length === 0) return ''
  const safeMax = max <= min ? min + 1 : max
  const stepX = values.length > 1 ? width / (values.length - 1) : width
  return values
    .map((value, index) => {
      const normalized = (value - min) / (safeMax - min)
      const x = index * stepX
      const y = height - normalized * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildAreaPath(linePath: string, values: number[], width: number, height: number): string {
  if (!linePath || values.length === 0) return ''
  return `${linePath} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams
}) {
  if (DEMO_MODE_ENABLED) {
    const demoCompany = DEMO_COMPANIES[0]
    const trend = [44, 52, 58, 61, 67, 63, 70, 75, 68]
    const trendLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
    const dimensions = [
      { code: 'exigencias_quantitativas', name: 'Exigencias Quantitativas', score: 81, classification: 'critico' as const },
      { code: 'exigencias_emocionais', name: 'Exigencias Emocionais', score: 74, classification: 'medio_alerta' as const },
      { code: 'burnout', name: 'Burnout', score: 69, classification: 'medio_alerta' as const },
      { code: 'estresse', name: 'Estresse', score: 63, classification: 'medio_alerta' as const },
      { code: 'apoio_social', name: 'Apoio Social', score: 39, classification: 'medio_alerta' as const },
      { code: 'influencia_no_trabalho', name: 'Influencia no Trabalho', score: 45, classification: 'medio_alerta' as const },
    ]

    return (
      <main className="min-h-screen bg-[#06080d] text-slate-100 p-6 md:p-10">
        <section className="max-w-7xl mx-auto space-y-6">
          <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-[#121723] via-[#0f1626] to-[#10252f] p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-black">Analytics Copsoq Demo</p>
            <h1 className="text-2xl md:text-3xl font-black mt-2">Painel BI Psicossocial</h1>
            <p className="text-sm text-slate-300 mt-2">Empresa: {demoCompany?.nomeFantasia ?? demoCompany?.razaoSocial ?? 'Demo'}</p>
            <p className="text-sm text-cyan-300 mt-1">Simulacao completa para navegacao comercial.</p>
          </header>

          <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Respondentes', value: '123', note: 'colaboradores ativos' },
              { label: 'Risco Medio', value: '67', note: 'escala 0-100' },
              { label: 'Criticos', value: '3', note: 'dimensoes >= 75' },
              { label: 'Alerta', value: '4', note: 'dimensoes 26-74' },
              { label: 'Taxa de Resposta', value: '91%', note: 'periodo atual' },
            ].map((kpi) => (
              <article key={kpi.label} className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{kpi.label}</p>
                <p className="text-3xl font-black mt-2">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-2">{kpi.note}</p>
              </article>
            ))}
          </section>

          <section className="grid xl:grid-cols-3 gap-4">
            <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Media Atual</p>
              <p className="text-3xl font-black mt-2 text-amber-300">67</p>
              <p className="text-xs text-slate-400 mt-2">benchmark interno</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Variacao Mensal</p>
              <p className="text-3xl font-black mt-2 text-rose-300">+6</p>
              <p className="text-xs text-slate-400 mt-2">vs periodo anterior</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Delta Mercado</p>
              <p className="text-3xl font-black mt-2 text-cyan-300">+8</p>
              <p className="text-xs text-slate-400 mt-2">comparativo global</p>
            </article>
          </section>

          <section className="grid xl:grid-cols-2 gap-6">
            <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 md:p-5">
              <p className="text-xl font-black">Atividade de Risco por Hora</p>
              <p className="text-sm text-slate-400">Volume medio de risco agregado no periodo.</p>
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#070d18] p-3 overflow-x-auto">
                <div className="min-w-[720px]">
                  <svg viewBox="0 0 720 260" className="w-full h-[260px]">
                    <defs>
                      <linearGradient id="demoArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(48,20)">
                      {[0, 25, 50, 75, 100].map((y) => {
                        const py = 200 - y * 2
                        return (
                          <g key={y}>
                            <line x1="0" y1={py} x2="620" y2={py} stroke="#1f2937" strokeWidth="1" />
                            <text x="-28" y={py + 4} fill="#64748b" fontSize="11">{y}</text>
                          </g>
                        )
                      })}
                      <path d={buildAreaPath(buildLinePath(trend, 620, 200), trend, 620, 200)} fill="url(#demoArea)" />
                      <path d={buildLinePath(trend, 620, 200)} fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                      {trend.map((value, index) => {
                        const x = trend.length > 1 ? (620 / (trend.length - 1)) * index : 0
                        const y = 200 - value * 2
                        return <circle key={index} cx={x} cy={y} r="4" fill="#dbeafe" />
                      })}
                      {trendLabels.map((label, index) => {
                        const x = trendLabels.length > 1 ? (620 / (trendLabels.length - 1)) * index : 0
                        return <text key={label} x={x} y={228} fill="#94a3b8" textAnchor="middle" fontSize="11">{label}</text>
                      })}
                    </g>
                  </svg>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5">
              <p className="text-xl font-black">Risco por Setor</p>
              <p className="text-sm text-slate-400">Comparativo rapido para priorizacao de acoes.</p>
              <div className="mt-5 space-y-4">
                {[
                  { label: 'Logistica', score: 80, respondents: 22 },
                  { label: 'Producao', score: 73, respondents: 31 },
                  { label: 'Comercial', score: 58, respondents: 18 },
                  { label: 'Administrativo', score: 41, respondents: 16 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>{row.label}</span>
                      <span>{row.score} ({row.respondents})</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`${barClass(row.score)} h-full`} style={{ width: `${row.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0f1219] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">Dimensoes COPSOQ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#0b1220] text-slate-400 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-3">Dimensao</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Classificacao</th>
                    <th className="text-left px-4 py-3">Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((item) => (
                    <tr key={item.code} className="border-t border-slate-900">
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      <td className={`px-4 py-3 font-bold ${scoreClass(item.score)}`}>{item.score}</td>
                      <td className="px-4 py-3">{classificationLabel(item.classification)}</td>
                      <td className="px-4 py-3">
                        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className={`${barClass(item.score)} h-full`} style={{ width: `${item.score}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0f1219] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">Drilldown Individual (Demo)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-[#0b1220] text-slate-400 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Colaborador</th>
                    <th className="text-left px-4 py-3">Setor</th>
                    <th className="text-left px-4 py-3">GHE</th>
                    <th className="text-left px-4 py-3">Dimensao</th>
                    <th className="text-left px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['2026-03-24', 'Ana Souza', 'Logistica', 'GHE-Log-01', 'Exigencias Quantitativas', 84],
                    ['2026-03-24', 'Marina Alves', 'Producao', 'GHE-Prod-02', 'Estresse', 76],
                    ['2026-03-23', 'Carlos Lima', 'Comercial', 'GHE-Com-01', 'Burnout', 71],
                    ['2026-03-22', 'Fernanda Rocha', 'Administrativo', 'GHE-Adm-01', 'Apoio Social', 37],
                  ].map((row, index) => (
                    <tr key={index} className="border-t border-slate-900">
                      <td className="px-4 py-3 text-slate-300">{row[0]}</td>
                      <td className="px-4 py-3">{row[1]}</td>
                      <td className="px-4 py-3">{row[2]}</td>
                      <td className="px-4 py-3">{row[3]}</td>
                      <td className="px-4 py-3">{row[4]}</td>
                      <td className={`px-4 py-3 font-bold ${scoreClass(Number(row[5]))}`}>{row[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    )
  }
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
          <h1 className="text-xl font-black text-slate-900">Analytics COPSOQ</h1>
          <p className="text-sm text-slate-600 mt-3">Perfil sem empresa vinculada para visualizacao de analytics.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para dashboard
          </Link>
        </section>
      </main>
    )
  }

  const now = new Date()
  const queryCompanyId = (getSingleValue(searchParams?.companyId) ?? '').trim()
  const periodStart = (getSingleValue(searchParams?.periodStart) ?? startOfMonthISO(now)).trim()
  const periodEnd = (getSingleValue(searchParams?.periodEnd) ?? endOfMonthISO(now)).trim()
  const setorNome = (getSingleValue(searchParams?.setorNome) ?? '').trim() || null
  const gheNome = (getSingleValue(searchParams?.gheNome) ?? '').trim() || null
  const isTechnical = profile.role === 'admin' || profile.role === 'tecnico'

  const companyId = profile.company_id ?? (isTechnical && queryCompanyId ? queryCompanyId : null)

  if (!companyId && !isTechnical) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-5xl mx-auto bg-white border border-amber-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">Analytics COPSOQ</h1>
          <p className="text-sm text-slate-700 mt-3">
            Perfil tecnico sem empresa vinculada. Informe <span className="font-bold">companyId</span> na URL para consultar.
          </p>
        </section>
      </main>
    )
  }

  const scope = {
    companyId,
    periodStart,
    periodEnd,
    setorNome,
    gheNome,
  }

  const [overview, timeseries, distribution, benchmark, drilldown] = await Promise.all([
    getAnalyticsOverview(scope),
    getAnalyticsTimeseries({ scope, grain: 'day', metric: 'avg_risk' }),
    getAnalyticsDistribution({ scope, groupBy: 'setor', metric: 'avg_risk' }),
    getAnalyticsBenchmark({ scope, dimensionCode: null }),
    isTechnical ? getAnalyticsDrilldown({ scope, dimensionCode: null, page: 1, pageSize: 15 }) : null,
  ])

  const seriesValues = timeseries.series.map((item) => item.value)
  const seriesLabels = timeseries.series.map((item) => item.bucket)

  return (
    <main className="min-h-screen bg-[#06080d] text-slate-100 p-6 md:p-10">
      <section className="max-w-7xl mx-auto space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-[#121723] via-[#0f1626] to-[#10252f] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-black">Analytics Copsoq</p>
          <h1 className="text-2xl md:text-3xl font-black mt-2">Painel Completo de Analise</h1>
          <p className="text-sm text-slate-300 mt-2">Periodo: {periodStart} ate {periodEnd}</p>
          <p className="text-sm text-cyan-300 mt-1">
            Escopo atual: {companyId ? `Empresa ${companyId}` : 'Todas as empresas (admin)'}
          </p>
          <form method="GET" className="mt-4 grid md:grid-cols-5 gap-3">
            {isTechnical ? (
              <input
                name="companyId"
                defaultValue={companyId ?? ''}
                placeholder="companyId (vazio = todas)"
                className="px-3 py-2 rounded-xl bg-[#0b1220] border border-slate-700 text-sm"
              />
            ) : null}
            <input type="date" name="periodStart" defaultValue={periodStart} className="px-3 py-2 rounded-xl bg-[#0b1220] border border-slate-700 text-sm" />
            <input type="date" name="periodEnd" defaultValue={periodEnd} className="px-3 py-2 rounded-xl bg-[#0b1220] border border-slate-700 text-sm" />
            <input name="setorNome" defaultValue={setorNome ?? ''} placeholder="Setor" className="px-3 py-2 rounded-xl bg-[#0b1220] border border-slate-700 text-sm" />
            <input name="gheNome" defaultValue={gheNome ?? ''} placeholder="GHE" className="px-3 py-2 rounded-xl bg-[#0b1220] border border-slate-700 text-sm" />
            <button type="submit" className="md:col-span-5 w-full md:w-auto px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold">
              Aplicar Filtros
            </button>
          </form>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Respondentes</p>
            <p className="text-3xl font-black mt-2">{overview.kpis.respondents}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Risco Medio</p>
            <p className={`text-3xl font-black mt-2 ${scoreClass(overview.kpis.avgRiskScore)}`}>{overview.kpis.avgRiskScore}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Criticos</p>
            <p className="text-3xl font-black text-rose-300 mt-2">{overview.kpis.criticalDimensions}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Alerta</p>
            <p className="text-3xl font-black text-amber-300 mt-2">{overview.kpis.alertDimensions}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Taxa de Resposta</p>
            <p className="text-3xl font-black text-cyan-300 mt-2">{overview.kpis.responseRate}%</p>
          </article>
        </section>

        <section className="grid xl:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 md:p-5">
            <p className="text-xl font-black">Tendencia de Risco</p>
            <p className="text-sm text-slate-400">Media por dia para identificar picos de pressao.</p>
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#070d18] p-3 overflow-x-auto">
              <div className="min-w-[760px]">
                <svg viewBox="0 0 760 280" className="w-full h-[280px]">
                  <defs>
                    <linearGradient id="riskArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <g transform="translate(52,22)">
                    {[0, 25, 50, 75, 100].map((y) => {
                      const py = 210 - y * 2.1
                      return (
                        <g key={y}>
                          <line x1="0" y1={py} x2="660" y2={py} stroke="#1f2937" strokeWidth="1" />
                          <text x="-30" y={py + 4} fill="#64748b" fontSize="11">{y}</text>
                        </g>
                      )
                    })}
                    <path d={buildAreaPath(buildLinePath(seriesValues, 660, 210), seriesValues, 660, 210)} fill="url(#riskArea)" />
                    <path d={buildLinePath(seriesValues, 660, 210)} fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                    {seriesValues.map((value, index) => {
                      const x = seriesValues.length > 1 ? (660 / (seriesValues.length - 1)) * index : 0
                      const y = 210 - value * 2.1
                      return <circle key={`${value}-${index}`} cx={x} cy={y} r="3.5" fill="#dbeafe" />
                    })}
                    {seriesLabels.map((label, index) => {
                      const x = seriesLabels.length > 1 ? (660 / (seriesLabels.length - 1)) * index : 0
                      return (
                        <text key={`${label}-${index}`} x={x} y={240} fill="#94a3b8" textAnchor="middle" fontSize="10">
                          {label}
                        </text>
                      )
                    })}
                  </g>
                </svg>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5">
            <p className="text-xl font-black">Distribuicao por Setor</p>
            <p className="text-sm text-slate-400">Priorizacao de atuacao por maior risco medio.</p>
            <div className="mt-5 space-y-4">
              {distribution.rows.length === 0 ? (
                <p className="text-sm text-slate-400">Sem dados no periodo selecionado.</p>
              ) : (
                distribution.rows.map((row) => (
                  <div key={row.groupKey}>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1 gap-2">
                      <span className="truncate">{row.groupLabel}</span>
                      <span>{row.value} ({row.respondents})</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`${barClass(row.value)} h-full`} style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid xl:grid-cols-3 gap-6">
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-5">
            <p className="text-sm uppercase tracking-widest text-slate-400 font-black">Benchmark Interno</p>
            <p className="text-3xl font-black mt-3">{benchmark.company.currentMean}</p>
            <p className="text-xs text-slate-400 mt-2">Media atual da empresa</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-5">
            <p className="text-sm uppercase tracking-widest text-slate-400 font-black">Variacao vs Periodo Anterior</p>
            <p className={`text-3xl font-black mt-3 ${benchmark.company.variation !== null && benchmark.company.variation > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
              {benchmark.company.variation === null ? '-' : `${benchmark.company.variation > 0 ? '+' : ''}${benchmark.company.variation}`}
            </p>
            <p className="text-xs text-slate-400 mt-2">Comparativo automatico</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-[#0f1219] p-5">
            <p className="text-sm uppercase tracking-widest text-slate-400 font-black">Delta vs Mercado</p>
            <p className={`text-3xl font-black mt-3 ${benchmark.peers.deltaVsMarket !== null && benchmark.peers.deltaVsMarket > 0 ? 'text-rose-300' : 'text-cyan-300'}`}>
              {benchmark.peers.deltaVsMarket === null ? '-' : `${benchmark.peers.deltaVsMarket > 0 ? '+' : ''}${benchmark.peers.deltaVsMarket}`}
            </p>
            <p className="text-xs text-slate-400 mt-2">Referencia com media global</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0f1219] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">Dimensoes COPSOQ</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#0b1220] text-slate-400 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="text-left px-4 py-3">Dimensao</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Classificacao</th>
                  <th className="text-left px-4 py-3">Barra</th>
                </tr>
              </thead>
              <tbody>
                {overview.dimensions.map((item) => (
                  <tr key={item.dimensionCode} className="border-t border-slate-900">
                    <td className="px-4 py-3 font-semibold">{item.dimensionName}</td>
                    <td className={`px-4 py-3 font-bold ${scoreClass(item.meanScore)}`}>{item.meanScore}</td>
                    <td className="px-4 py-3">{classificationLabel(item.classification)}</td>
                    <td className="px-4 py-3">
                      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`${barClass(item.meanScore)} h-full`} style={{ width: `${item.meanScore}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isTechnical && drilldown ? (
          <section className="rounded-2xl border border-slate-800 bg-[#0f1219] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">Drilldown Individual (Tecnico)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-sm">
                <thead className="bg-[#0b1220] text-slate-400 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Colaborador</th>
                    <th className="text-left px-4 py-3">Setor</th>
                    <th className="text-left px-4 py-3">GHE</th>
                    <th className="text-left px-4 py-3">Dimensao</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Classificacao</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldown.rows.map((row) => (
                    <tr key={`${row.sessionId}-${row.dimensionCode}`} className="border-t border-slate-900">
                      <td className="px-4 py-3 text-slate-300">{row.companyId}</td>
                      <td className="px-4 py-3 text-slate-300">{row.submittedAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">{row.collaboratorName ?? '-'}</td>
                      <td className="px-4 py-3">{row.setorNome ?? '-'}</td>
                      <td className="px-4 py-3">{row.gheNome ?? '-'}</td>
                      <td className="px-4 py-3">{row.dimensionName}</td>
                      <td className={`px-4 py-3 font-bold ${scoreClass(row.score)}`}>{row.score}</td>
                      <td className="px-4 py-3">{classificationLabel(row.classification)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
