'use client'

import dynamic from 'next/dynamic'
import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildDemoLogoutCookie,
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

  const handleLogout = () => {
    document.cookie = buildDemoLogoutCookie()
    router.push('/login')
    router.refresh()
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
