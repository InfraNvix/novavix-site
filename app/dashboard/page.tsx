'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/auth/roles'
import {
  buildDemoLogoutCookie,
  DEMO_COMPANY_AUTH,
  DEMO_MODE_ENABLED,
  getDemoCompanyByCnpj,
  getDemoEmployeesByCompanyId,
  getDemoRoleFromCookieHeader,
  type DemoEmployee,
} from '@/lib/auth/demo'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

type PerfilLegado = {
  nome_empresa: string | null
  cnpj: string | null
  email: string | null
}

type CompanyProfile = {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  status: string
}

type AccessProfile = {
  role: UserRole
  company: CompanyProfile | null
}

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

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<PerfilLegado | null>(null)
  const [accessProfile, setAccessProfile] = useState<AccessProfile | null>(null)
  const [rows, setRows] = useState<DemoEmployee[]>([])
  const [search, setSearch] = useState('')
  const [whatsFilter, setWhatsFilter] = useState<WhatsAppFilter>('todos')
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('todos')
  const [onlyAtivos, setOnlyAtivos] = useState(true)
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('todos')
  const router = useRouter()

  const supabase = useMemo(() => {
    if (DEMO_MODE_ENABLED) {
      return null
    }
    return getSupabaseBrowserClient()
  }, [])

  useEffect(() => {
    if (DEMO_MODE_ENABLED) {
      const demoRole = getDemoRoleFromCookieHeader(document.cookie)
      if (!demoRole) {
        router.push('/login')
        return
      }

      if (demoRole === 'admin') {
        router.push('/admin')
        return
      }

      const company = getDemoCompanyByCnpj(DEMO_COMPANY_AUTH.cnpj)
      if (!company) {
        router.push('/login')
        return
      }

      setUserEmail(DEMO_COMPANY_AUTH.email)
      setPerfil({
        nome_empresa: company.razaoSocial,
        cnpj: company.cnpj,
        email: DEMO_COMPANY_AUTH.email,
      })
      setAccessProfile({
        role: 'empresa',
        company: {
          id: company.id,
          cnpj: company.cnpj,
          razao_social: company.razaoSocial,
          nome_fantasia: company.nomeFantasia,
          status: company.status,
        },
      })
      setRows(getDemoEmployeesByCompanyId(company.id))
      return
    }

    if (!supabase) {
      router.push('/login')
      return
    }

    const getData = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login')
        return
      }

      setUserEmail(currentUser.email ?? 'usuario@novavix.local')
    }

    void getData()
  }, [router, supabase])

  const handleSignOut = async () => {
    if (DEMO_MODE_ENABLED) {
      document.cookie = buildDemoLogoutCookie()
      router.push('/login')
      router.refresh()
      return
    }

    if (!supabase) {
      router.push('/login')
      return
    }

    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const query = search.trim().toLowerCase()
      if (query) {
        const searchable = `${row.nome} ${row.cpf} ${row.whatsapp} ${row.email}`.toLowerCase()
        if (!searchable.includes(query)) {
          return false
        }
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
  }, [onlyAtivos, rows, search, smartFilter, tokenFilter, whatsFilter])

  const metrics = useMemo(() => {
    const ativos = rows.filter((row) => row.ativo).length
    const confirmados = rows.filter((row) => row.ativo && row.whatsappStatus === 'confirmado').length
    const tokensEnviados = rows.filter((row) => row.tokenEnviadoEm).length
    const tokensUsados = rows.filter((row) => row.tokenUsadoEm).length
    const respondidos = rows.filter((row) => row.questionarioRespondidoEm).length

    return {
      ativos,
      confirmados,
      tokensEnviados,
      tokensUsados,
      respondidos,
    }
  }, [rows])

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-xs animate-pulse">
        Carregando NOVAVIX GO...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white border-b border-slate-200 px-6 md:px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="relative w-[140px] h-[40px]">
          <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black uppercase text-slate-900 leading-none">
              {accessProfile?.company?.nome_fantasia ?? accessProfile?.company?.razao_social ?? perfil?.nome_empresa}
            </p>
            <p className="text-[9px] font-bold text-slate-400 mt-1">{userEmail}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
              CNPJ: {accessProfile?.company?.cnpj ?? perfil?.cnpj ?? '---'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[10px] font-black uppercase tracking-tighter text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
        <header>
          <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            Dashboard Demo - Empresa
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            Funcionarios e Confirmacoes de Questionario
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-sm">
            Saude ocupacional com foco em confirmacao WhatsApp e uso de token de acesso.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <article className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-black text-slate-500">Funcionarios Ativos</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{metrics.ativos}</p>
          </article>
          <article className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-black text-slate-500">WhatsApp Confirmado</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">{metrics.confirmados}</p>
          </article>
          <article className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-black text-slate-500">Tokens Enviados</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{metrics.tokensEnviados}</p>
          </article>
          <article className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-black text-slate-500">Tokens Usados</p>
            <p className="text-3xl font-black text-indigo-600 mt-2">{metrics.tokensUsados}</p>
          </article>
          <article className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-black text-slate-500">Questionarios Respondidos</p>
            <p className="text-3xl font-black text-violet-600 mt-2">{metrics.respondidos}</p>
          </article>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
          <div className="grid md:grid-cols-5 gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, CPF, WhatsApp ou e-mail"
              className="md:col-span-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <select
              value={whatsFilter}
              onChange={(event) => setWhatsFilter(event.target.value as WhatsAppFilter)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            >
              <option value="todos">WhatsApp: Todos</option>
              <option value="confirmado">WhatsApp: Confirmado</option>
              <option value="pendente">WhatsApp: Pendente</option>
              <option value="falhou">WhatsApp: Falhou</option>
            </select>
            <select
              value={tokenFilter}
              onChange={(event) => setTokenFilter(event.target.value as TokenFilter)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            >
              <option value="todos">Token: Todos</option>
              <option value="enviado">Token: Enviado</option>
              <option value="usado">Token: Usado</option>
              <option value="nao_enviado">Token: Nao Enviado</option>
            </select>
            <select
              value={smartFilter}
              onChange={(event) => setSmartFilter(event.target.value as SmartFilter)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            >
              <option value="todos">Filtro Inteligente: Todos</option>
              <option value="prioridade">Prioridade: sem confirmacao ou sem uso</option>
              <option value="engajados">Engajados: token usado e respondeu</option>
              <option value="sem_retorno">Sem retorno: token enviado sem acesso</option>
            </select>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              id="somente-ativos"
              type="checkbox"
              checked={onlyAtivos}
              onChange={(event) => setOnlyAtivos(event.target.checked)}
            />
            <label htmlFor="somente-ativos" className="text-sm text-slate-600 font-medium">
              Mostrar somente funcionarios ativos
            </label>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 md:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">
              Tabela Completa ({filteredRows.length} registros)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
                <tr>
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
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCpf(row.cpf)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatWhatsapp(row.whatsapp)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${
                          row.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
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
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.tokenEnviadoEm)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.tokenUsadoEm)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.questionarioAcessadoEm)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.questionarioRespondidoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
