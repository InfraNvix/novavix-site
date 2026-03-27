'use client'

import dynamic from 'next/dynamic'
import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DEMO_ADMIN_AUTH,
  DEMO_COMPANIES,
  DEMO_EMPLOYEES,
  DEMO_MODE_ENABLED,
  getDemoCompanyById,
  type DemoEmployee,
} from '@/lib/auth/demo'

const AdminStudio = dynamic(
  async () => {
    const config = (await import('@/sanity.config')).default
    const Studio = (await import('./Studio')).default
    return () => <Studio config={config} />
  },
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-white flex items-center justify-center font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
        Iniciando Novavix Admin...
      </div>
    ),
  }
)

type WhatsAppFilter = 'todos' | 'confirmado' | 'pendente' | 'falhou'
type TokenFilter = 'todos' | 'enviado' | 'usado' | 'nao_enviado'
type SmartFilter = 'todos' | 'prioridade' | 'engajados' | 'sem_retorno'
type AdminViewMode = 'executivo' | 'operacional' | 'compliance'

function toSvgPoints(
  values: number[],
  width: number,
  height: number,
  maxValue = 100,
  xOffset = 0,
  yOffset = 0
): Array<{ x: number; y: number }> {
  if (values.length === 0) {
    return []
  }
  const stepX = values.length > 1 ? width / (values.length - 1) : width
  return values.map((value, index) => ({
    x: xOffset + index * stepX,
    y: yOffset + height - (Math.max(0, Math.min(maxValue, value)) / maxValue) * height,
  }))
}

function toLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return ''
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const cx = (prev.x + curr.x) / 2
    path += ` Q ${cx} ${prev.y}, ${curr.x} ${curr.y}`
  }
  return path
}

function toAreaPath(points: Array<{ x: number; y: number }>, xStart: number, xEnd: number, yBase: number): string {
  if (points.length === 0) {
    return ''
  }
  const linePath = toLinePath(points)
  return `${linePath} L ${xEnd} ${yBase} L ${xStart} ${yBase} Z`
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCpf(value: string): string {
  if (value.length !== 11) {
    return value
  }
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
}

function formatWhatsapp(value: string): string {
  if (value.length !== 11) {
    return value
  }
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`
}

function getWhatsAppBadge(status: DemoEmployee['whatsappStatus']): string {
  if (status === 'confirmado') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (status === 'pendente') {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-rose-100 text-rose-700'
}

function DemoAdminPanel() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('todas')
  const [whatsFilter, setWhatsFilter] = useState<WhatsAppFilter>('todos')
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('todos')
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('todos')
  const [onlyAtivos, setOnlyAtivos] = useState(true)
  const [viewMode, setViewMode] = useState<AdminViewMode>('executivo')

  const handleLogout = () => {
    void (async () => {
      await fetch('/api/auth/demo-logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    })()
  }

  const filteredRows = useMemo(() => {
    return DEMO_EMPLOYEES.filter((row) => {
      const query = search.trim().toLowerCase()
      if (query) {
        const company = getDemoCompanyById(row.companyId)
        const searchable = `${row.nome} ${row.cpf} ${row.whatsapp} ${row.email} ${company?.nomeFantasia ?? ''}`.toLowerCase()
        if (!searchable.includes(query)) {
          return false
        }
      }

      if (companyFilter !== 'todas' && row.companyId !== companyFilter) {
        return false
      }

      if (onlyAtivos && !row.ativo) {
        return false
      }

      if (whatsFilter !== 'todos' && row.whatsappStatus !== whatsFilter) {
        return false
      }

      if (tokenFilter === 'enviado' && !row.tokenEnviadoEm) {
        return false
      }

      if (tokenFilter === 'usado' && !row.tokenUsadoEm) {
        return false
      }

      if (tokenFilter === 'nao_enviado' && row.tokenEnviadoEm) {
        return false
      }

      if (smartFilter === 'prioridade') {
        return row.ativo && (row.whatsappStatus !== 'confirmado' || (row.tokenEnviadoEm && !row.tokenUsadoEm))
      }

      if (smartFilter === 'engajados') {
        return row.ativo && Boolean(row.tokenUsadoEm && row.questionarioRespondidoEm)
      }

      if (smartFilter === 'sem_retorno') {
        return row.ativo && Boolean(row.tokenEnviadoEm) && !row.questionarioAcessadoEm
      }

      return true
    })
  }, [companyFilter, onlyAtivos, search, smartFilter, tokenFilter, whatsFilter])

  const metrics = useMemo(() => {
    const ativos = DEMO_EMPLOYEES.filter((row) => row.ativo).length
    const confirmados = DEMO_EMPLOYEES.filter((row) => row.ativo && row.whatsappStatus === 'confirmado').length
    const tokensEnviados = DEMO_EMPLOYEES.filter((row) => row.tokenEnviadoEm).length
    const tokensUsados = DEMO_EMPLOYEES.filter((row) => row.tokenUsadoEm).length
    const respondidos = DEMO_EMPLOYEES.filter((row) => row.questionarioRespondidoEm).length

    return { ativos, confirmados, tokensEnviados, tokensUsados, respondidos }
  }, [])

  const copsoqExec = useMemo(() => {
    const riskByCompany = DEMO_COMPANIES.map((company) => {
      const employees = DEMO_EMPLOYEES.filter((item) => item.companyId === company.id && item.ativo)
      const respondents = employees.filter((item) => item.questionarioRespondidoEm).length
      const baseRisk = company.id === 'demo-company-1' ? 67 : 58
      const adjustedRisk = Math.min(95, Math.max(20, baseRisk + (employees.length - respondents) * 2))
      return {
        companyId: company.id,
        companyName: company.nomeFantasia,
        respondents,
        riskScore: adjustedRisk,
      }
    })

    const dimensions = [
      { name: 'Exigencias Quantitativas', score: 81 },
      { name: 'Exigencias Emocionais', score: 74 },
      { name: 'Conflito Trabalho-Familia', score: 66 },
      { name: 'Estresse', score: 62 },
      { name: 'Burnout', score: 57 },
      { name: 'Qualidade da Lideranca', score: 49 },
      { name: 'Apoio Social', score: 38 },
      { name: 'Influencia no Trabalho', score: 45 },
    ]

    const weeklyRisk = [
      { week: 'S1', value: 59 },
      { week: 'S2', value: 61 },
      { week: 'S3', value: 65 },
      { week: 'S4', value: 63 },
    ]

    const activityHours = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    const activityOverall = [28, 56, 34, 30, 88, 44, 36]
    const activityByChannel = [
      { name: 'WhatsApp', values: [4, 52, 58, 12, 26, 90, 43] },
      { name: 'Portal Web', values: [3, 38, 41, 9, 19, 63, 32] },
      { name: 'E-mail', values: [1, 12, 14, 5, 7, 18, 8] },
    ]

    const allRespondents = riskByCompany.reduce((acc, item) => acc + item.respondents, 0)
    const criticalDimensions = dimensions.filter((item) => item.score >= 75).length
    const alertDimensions = dimensions.filter((item) => item.score >= 26 && item.score <= 74).length
    const healthyDimensions = dimensions.filter((item) => item.score <= 25).length
    const avgRisk = Math.round(dimensions.reduce((acc, item) => acc + item.score, 0) / dimensions.length)
    const topDimension = dimensions.reduce((prev, current) => (current.score > prev.score ? current : prev))

    return {
      riskByCompany,
      dimensions,
      weeklyRisk,
      activityHours,
      activityOverall,
      activityByChannel,
      allRespondents,
      criticalDimensions,
      alertDimensions,
      healthyDimensions,
      avgRisk,
      topDimension,
    }
  }, [])

  const getRiskBarColor = (score: number): string => {
    if (score >= 75) return 'bg-rose-500'
    if (score >= 26) return 'bg-amber-400'
    return 'bg-emerald-500'
  }

  const operationalFunnel = useMemo(() => {
    const base = DEMO_EMPLOYEES.filter((row) => row.ativo)
    const convidados = base.length
    const tokensEnviados = base.filter((row) => row.tokenEnviadoEm).length
    const acessaram = base.filter((row) => row.questionarioAcessadoEm).length
    const responderam = base.filter((row) => row.questionarioRespondidoEm).length

    return { convidados, tokensEnviados, acessaram, responderam }
  }, [])

  const priorityAlerts = useMemo(() => {
    const alerts = DEMO_EMPLOYEES.filter((row) => row.ativo)
      .map((row) => {
        const company = getDemoCompanyById(row.companyId)
        if (row.whatsappStatus === 'falhou') {
          return {
            id: row.id,
            level: 'alto',
            title: 'Falha de confirmacao WhatsApp',
            employee: row.nome,
            company: company?.nomeFantasia ?? '-',
            action: 'Validar contato e reenviar convite.',
          }
        }
        if (row.tokenEnviadoEm && !row.questionarioAcessadoEm) {
          return {
            id: row.id,
            level: 'medio',
            title: 'Token enviado sem acesso',
            employee: row.nome,
            company: company?.nomeFantasia ?? '-',
            action: 'Disparar lembrete em ate 24h.',
          }
        }
        if (row.questionarioAcessadoEm && !row.questionarioRespondidoEm) {
          return {
            id: row.id,
            level: 'medio',
            title: 'Questionario iniciado sem envio',
            employee: row.nome,
            company: company?.nomeFantasia ?? '-',
            action: 'Contato de suporte para remover bloqueio.',
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    return alerts.slice(0, 8)
  }, [])

  const complianceStats = useMemo(() => {
    const total = DEMO_EMPLOYEES.length
    const withoutEmail = DEMO_EMPLOYEES.filter((row) => !row.email || row.email.trim().length === 0).length
    const inactive = DEMO_EMPLOYEES.filter((row) => !row.ativo).length
    const withoutToken = DEMO_EMPLOYEES.filter((row) => !row.tokenEnviadoEm).length
    return { total, withoutEmail, inactive, withoutToken }
  }, [])

  const chartOuterWidth = 700
  const chartOuterHeight = 290
  const chartMarginLeft = 46
  const chartMarginRight = 36
  const chartMarginTop = 20
  const chartMarginBottom = 40
  const chartPlotWidth = chartOuterWidth - chartMarginLeft - chartMarginRight
  const chartPlotHeight = chartOuterHeight - chartMarginTop - chartMarginBottom

  const overallPoints = toSvgPoints(
    copsoqExec.activityOverall,
    chartPlotWidth,
    chartPlotHeight,
    100,
    chartMarginLeft,
    chartMarginTop
  )
  const overallLinePath = toLinePath(overallPoints)
  const overallAreaPath = toAreaPath(
    overallPoints,
    chartMarginLeft,
    chartMarginLeft + chartPlotWidth,
    chartMarginTop + chartPlotHeight
  )
  const channelSeries = copsoqExec.activityByChannel.map((series) => ({
    ...series,
    points: toSvgPoints(series.values, chartPlotWidth, chartPlotHeight, 100, chartMarginLeft, chartMarginTop),
    path: toLinePath(toSvgPoints(series.values, chartPlotWidth, chartPlotHeight, 100, chartMarginLeft, chartMarginTop)),
  }))

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-black">Painel Admin Demo</p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">Governanca de Envios e Tokens</h1>
            <p className="text-sm text-slate-400 mt-2">
              Conta demo: {DEMO_ADMIN_AUTH.email} | Empresas em visao: {DEMO_COMPANIES.length}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-black uppercase tracking-widest bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-lg"
          >
            Sair
          </button>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('executivo')}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
                viewMode === 'executivo' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 border border-slate-700'
              }`}
            >
              Executivo
            </button>
            <button
              onClick={() => setViewMode('operacional')}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
                viewMode === 'operacional' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 border border-slate-700'
              }`}
            >
              Operacional
            </button>
            <button
              onClick={() => setViewMode('compliance')}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
                viewMode === 'compliance' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 border border-slate-700'
              }`}
            >
              Compliance
            </button>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[10px] uppercase font-black text-slate-400">Funcionarios Ativos</p>
            <p className="text-3xl font-black mt-2">{metrics.ativos}</p>
          </article>
          <article className="rounded-2xl border border-emerald-700/50 bg-emerald-900/20 p-4">
            <p className="text-[10px] uppercase font-black text-emerald-300">WhatsApp Confirmado</p>
            <p className="text-3xl font-black mt-2 text-emerald-300">{metrics.confirmados}</p>
          </article>
          <article className="rounded-2xl border border-blue-700/50 bg-blue-900/20 p-4">
            <p className="text-[10px] uppercase font-black text-blue-300">Tokens Enviados</p>
            <p className="text-3xl font-black mt-2 text-blue-300">{metrics.tokensEnviados}</p>
          </article>
          <article className="rounded-2xl border border-indigo-700/50 bg-indigo-900/20 p-4">
            <p className="text-[10px] uppercase font-black text-indigo-300">Tokens Usados</p>
            <p className="text-3xl font-black mt-2 text-indigo-300">{metrics.tokensUsados}</p>
          </article>
          <article className="rounded-2xl border border-violet-700/50 bg-violet-900/20 p-4">
            <p className="text-[10px] uppercase font-black text-violet-300">Questionarios Respondidos</p>
            <p className="text-3xl font-black mt-2 text-violet-300">{metrics.respondidos}</p>
          </article>
        </section>

        {viewMode === 'executivo' ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-black">COPSOQ - Visao Admin Executiva</p>
            <h2 className="text-2xl font-black mt-2">Risco Psicossocial Consolidado</h2>
            <p className="text-sm text-slate-400 mt-1">Dados simulados com foco em comparativo entre empresas, dimensoes e tendencia.</p>
          </div>

          <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-[10px] uppercase font-black text-slate-400">Respondentes COPSOQ</p>
              <p className="text-3xl font-black mt-2 text-white">{copsoqExec.allRespondents}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-[10px] uppercase font-black text-slate-400">Risco Medio</p>
              <p className="text-3xl font-black mt-2 text-amber-300">{copsoqExec.avgRisk}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-[10px] uppercase font-black text-slate-400">Dimensoes Criticas</p>
              <p className="text-3xl font-black mt-2 text-rose-300">{copsoqExec.criticalDimensions}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-[10px] uppercase font-black text-slate-400">Dimensoes Alerta</p>
              <p className="text-3xl font-black mt-2 text-amber-300">{copsoqExec.alertDimensions}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-[10px] uppercase font-black text-slate-400">Top Risco</p>
              <p className="text-sm font-black mt-2 text-rose-300 leading-tight">{copsoqExec.topDimension.name}</p>
              <p className="text-xs text-slate-400 mt-1">{copsoqExec.topDimension.score} pontos</p>
            </article>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-black text-slate-100">Risco Medio por Empresa</p>
              <div className="mt-4 space-y-3">
                {copsoqExec.riskByCompany.map((item) => (
                  <div key={item.companyId}>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>{item.companyName}</span>
                      <span>{item.riskScore}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${getRiskBarColor(item.riskScore)}`} style={{ width: `${item.riskScore}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{item.respondents} respondentes</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-black text-slate-100">Tendencia Semanal de Risco</p>
              <div className="mt-4 h-[180px] flex items-end gap-3">
                {copsoqExec.weeklyRisk.map((point) => (
                  <div key={point.week} className="flex-1 flex flex-col items-center">
                    <div className="text-xs text-slate-300 mb-1">{point.value}</div>
                    <div
                      className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-cyan-600 to-blue-300"
                      style={{ height: `${point.value * 1.9}px` }}
                    />
                    <div className="text-xs text-slate-500 mt-2">{point.week}</div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4 overflow-hidden">
              <p className="text-lg font-black text-slate-100">Atividade por Hora</p>
              <p className="text-sm text-slate-400 mt-1">Volume agregado de interacoes ao longo do periodo.</p>
              <div className="mt-4">
                <svg viewBox={`0 0 ${chartOuterWidth} ${chartOuterHeight}`} className="w-full h-[300px]">
                  <defs>
                    <linearGradient id="adminAreaGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  {[0, 25, 50, 75, 100].map((level) => {
                    const y = chartMarginTop + chartPlotHeight - (level / 100) * chartPlotHeight
                    return (
                      <line
                        key={level}
                        x1={chartMarginLeft}
                        y1={y}
                        x2={chartMarginLeft + chartPlotWidth}
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                    )
                  })}
                  <path d={overallAreaPath} fill="url(#adminAreaGradient)" />
                  <path d={overallLinePath} fill="none" stroke="#93c5fd" strokeWidth="2.5" />
                  {overallPoints.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r="3.2" fill="#e2e8f0" />
                  ))}
                  {copsoqExec.activityHours.map((label, index) => (
                    <text
                      key={label}
                      x={overallPoints[index]?.x ?? 0}
                      y={chartOuterHeight - 10}
                      textAnchor={
                        index === 0
                          ? 'start'
                          : index === copsoqExec.activityHours.length - 1
                          ? 'end'
                          : 'middle'
                      }
                      fontSize="11"
                      fill="#94a3b8"
                    >
                      {label}
                    </text>
                  ))}
                </svg>
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950 p-4 overflow-hidden">
              <p className="text-lg font-black text-slate-100">Timeline de Atividade dos Canais</p>
              <p className="text-sm text-slate-400 mt-1">Comparativo de comportamento por canal ao longo do tempo.</p>
              <div className="mt-4">
                <svg viewBox={`0 0 ${chartOuterWidth} ${chartOuterHeight}`} className="w-full h-[300px]">
                  {[0, 25, 50, 75, 100].map((level) => {
                    const y = chartMarginTop + chartPlotHeight - (level / 100) * chartPlotHeight
                    return (
                      <line
                        key={level}
                        x1={chartMarginLeft}
                        y1={y}
                        x2={chartMarginLeft + chartPlotWidth}
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                    )
                  })}
                  {channelSeries.map((series, seriesIndex) => {
                    const stroke = seriesIndex === 0 ? '#e2e8f0' : seriesIndex === 1 ? '#93c5fd' : '#cbd5e1'
                    return (
                      <g key={series.name}>
                        <path d={series.path} fill="none" stroke={stroke} strokeWidth={seriesIndex === 0 ? '2.4' : '2'} opacity={seriesIndex === 2 ? '0.85' : '1'} />
                        {series.points.map((point, index) => (
                          <circle key={index} cx={point.x} cy={point.y} r="3.1" fill={stroke} />
                        ))}
                      </g>
                    )
                  })}
                  {copsoqExec.activityHours.map((label, index) => (
                    <text
                      key={label}
                      x={overallPoints[index]?.x ?? 0}
                      y={chartOuterHeight - 10}
                      textAnchor={
                        index === 0
                          ? 'start'
                          : index === copsoqExec.activityHours.length - 1
                          ? 'end'
                          : 'middle'
                      }
                      fontSize="11"
                      fill="#94a3b8"
                    >
                      {label}
                    </text>
                  ))}
                </svg>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                {channelSeries.map((series, seriesIndex) => (
                  <span key={series.name} className="inline-flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${seriesIndex === 0 ? 'bg-slate-200' : seriesIndex === 1 ? 'bg-blue-300' : 'bg-slate-300'}`} />
                    {series.name}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-sm font-black text-slate-100">Ranking de Dimensoes COPSOQ</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-slate-400 uppercase text-[10px] tracking-widest">
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-3 py-2">Dimensao</th>
                    <th className="text-left px-3 py-2">Score</th>
                    <th className="text-left px-3 py-2">Classificacao</th>
                    <th className="text-left px-3 py-2">Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {copsoqExec.dimensions.map((item) => (
                    <tr key={item.name} className="border-t border-slate-900">
                      <td className="px-3 py-3 font-semibold text-slate-100">{item.name}</td>
                      <td className="px-3 py-3 text-slate-300">{item.score}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-[11px] font-black px-2 py-1 rounded-full ${
                            item.score >= 75
                              ? 'bg-rose-900/60 text-rose-300'
                              : item.score >= 26
                              ? 'bg-amber-900/60 text-amber-300'
                              : 'bg-emerald-900/60 text-emerald-300'
                          }`}
                        >
                          {item.score >= 75 ? 'Critico' : item.score >= 26 ? 'Alerta' : 'Saudavel'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className={`h-full ${getRiskBarColor(item.score)}`} style={{ width: `${item.score}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Regra de classificacao: 0-25 Saudavel | 26-74 Alerta | 75-100 Critico.
            </p>
          </section>
        </section>
        ) : null}

        {viewMode === 'operacional' ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-black">Operacao - Funil e Alertas</p>
              <h2 className="text-2xl font-black mt-2">Acompanhamento Diario de Engajamento</h2>
            </div>
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Convidados Ativos</p>
                <p className="text-3xl font-black mt-2">{operationalFunnel.convidados}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Token Enviado</p>
                <p className="text-3xl font-black mt-2 text-blue-300">{operationalFunnel.tokensEnviados}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Acessaram</p>
                <p className="text-3xl font-black mt-2 text-amber-300">{operationalFunnel.acessaram}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Responderam</p>
                <p className="text-3xl font-black mt-2 text-emerald-300">{operationalFunnel.responderam}</p>
              </article>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-black text-slate-100">Centro de Alertas Prioritarios</p>
              <div className="mt-3 space-y-2">
                {priorityAlerts.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem alertas prioritarios no momento.</p>
                ) : (
                  priorityAlerts.map((alert) => (
                    <article key={alert.id} className="border border-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-100">{alert.title}</p>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full uppercase font-black ${
                            alert.level === 'alto' ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'
                          }`}
                        >
                          {alert.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{alert.employee} - {alert.company}</p>
                      <p className="text-xs text-cyan-300 mt-1">{alert.action}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        ) : null}

        {viewMode === 'compliance' ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-black">Compliance - Qualidade de Dados</p>
              <h2 className="text-2xl font-black mt-2">Integridade de Cadastro e Rastreabilidade</h2>
            </div>
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Total Cadastros</p>
                <p className="text-3xl font-black mt-2">{complianceStats.total}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Sem E-mail</p>
                <p className="text-3xl font-black mt-2 text-amber-300">{complianceStats.withoutEmail}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Inativos</p>
                <p className="text-3xl font-black mt-2 text-slate-300">{complianceStats.inactive}</p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase font-black text-slate-400">Sem Token Enviado</p>
                <p className="text-3xl font-black mt-2 text-rose-300">{complianceStats.withoutToken}</p>
              </article>
            </section>
            <section className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-black text-slate-100">Checklist de Governanca</p>
              <ul className="mt-3 text-sm text-slate-300 space-y-2">
                <li>Politica de reenvio de convite para status pendente/falhou.</li>
                <li>Rastreabilidade de token enviado, usado e resposta final.</li>
                <li>Controle de ativos/inativos para nao enviesar indicadores.</li>
                <li>Revisao mensal da qualidade de contatos por empresa.</li>
              </ul>
            </section>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <div className="grid md:grid-cols-6 gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por funcionario, contato ou empresa"
              className="md:col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            />
            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            >
              <option value="todas">Empresa: Todas</option>
              {DEMO_COMPANIES.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nomeFantasia}
                </option>
              ))}
            </select>
            <select
              value={whatsFilter}
              onChange={(event) => setWhatsFilter(event.target.value as WhatsAppFilter)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            >
              <option value="todos">WhatsApp: Todos</option>
              <option value="confirmado">WhatsApp: Confirmado</option>
              <option value="pendente">WhatsApp: Pendente</option>
              <option value="falhou">WhatsApp: Falhou</option>
            </select>
            <select
              value={tokenFilter}
              onChange={(event) => setTokenFilter(event.target.value as TokenFilter)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            >
              <option value="todos">Token: Todos</option>
              <option value="enviado">Token: Enviado</option>
              <option value="usado">Token: Usado</option>
              <option value="nao_enviado">Token: Nao Enviado</option>
            </select>
            <select
              value={smartFilter}
              onChange={(event) => setSmartFilter(event.target.value as SmartFilter)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            >
              <option value="todos">Filtro Inteligente: Todos</option>
              <option value="prioridade">Prioridade</option>
              <option value="engajados">Engajados</option>
              <option value="sem_retorno">Sem retorno</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="admin-somente-ativos"
              type="checkbox"
              checked={onlyAtivos}
              onChange={(event) => setOnlyAtivos(event.target.checked)}
            />
            <label htmlFor="admin-somente-ativos" className="text-sm text-slate-300 font-medium">
              Mostrar somente funcionarios ativos
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-[11px] uppercase tracking-widest font-black text-slate-300">
              Tabela Completa Admin ({filteredRows.length} registros)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Funcionario</th>
                  <th className="text-left px-4 py-3">CPF</th>
                  <th className="text-left px-4 py-3">WhatsApp</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Vinculo</th>
                  <th className="text-left px-4 py-3">Confirmacao WhatsApp</th>
                  <th className="text-left px-4 py-3">Token Enviado</th>
                  <th className="text-left px-4 py-3">Token Usado</th>
                  <th className="text-left px-4 py-3">Acesso Questionario</th>
                  <th className="text-left px-4 py-3">Resposta Questionario</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const company = getDemoCompanyById(row.companyId)

                  return (
                    <tr key={row.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100">{company?.nomeFantasia ?? '-'}</p>
                        <p className="text-xs text-slate-400">{company?.cnpj ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.nome}</td>
                      <td className="px-4 py-3 text-slate-300">{formatCpf(row.cpf)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatWhatsapp(row.whatsapp)}</td>
                      <td className="px-4 py-3 text-slate-300">{row.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${
                            row.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-600 text-slate-100'
                          }`}
                        >
                          {row.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${getWhatsAppBadge(row.whatsappStatus)}`}>
                          {row.whatsappStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(row.tokenEnviadoEm)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(row.tokenUsadoEm)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(row.questionarioAcessadoEm)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(row.questionarioRespondidoEm)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function AdminPage() {
  if (DEMO_MODE_ENABLED) {
    return <DemoAdminPanel />
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <Suspense fallback={null}>
        <AdminStudio />
      </Suspense>
    </div>
  )
}
