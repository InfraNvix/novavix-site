'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/auth/roles'
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<PerfilLegado | null>(null)
  const [accessProfile, setAccessProfile] = useState<AccessProfile | null>(null)
  const router = useRouter()

  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    const getData = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, company_id, companies:company_id(id, cnpj, razao_social, nome_fantasia, status)')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (profileData?.role) {
        const companyRow = Array.isArray(profileData.companies)
          ? profileData.companies[0]
          : profileData.companies

        setAccessProfile({
          role: profileData.role as UserRole,
          company: companyRow
            ? ({
                id: companyRow.id,
                cnpj: companyRow.cnpj,
                razao_social: companyRow.razao_social,
                nome_fantasia: companyRow.nome_fantasia,
                status: companyRow.status,
              } as CompanyProfile)
            : null,
        })
      }

      const { data: perfilData } = await supabase
        .from('perfis')
        .select('nome_empresa, cnpj, email')
        .eq('id', currentUser.id)
        .single()

      if (perfilData) {
        setPerfil(perfilData as PerfilLegado)
      }
    }

    void getData()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-xs animate-pulse">
        Carregando NOVAVIX GO...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scale-90 lg:scale-100 origin-top">
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="relative w-[140px] h-[40px]">
          <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black uppercase text-slate-900 leading-none">
              {accessProfile?.company?.nome_fantasia ??
                accessProfile?.company?.razao_social ??
                perfil?.nome_empresa ??
                'Carregando...'}
            </p>
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

      <main className="max-w-5xl mx-auto p-10">
        <header className="mb-10">
          <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Painel Operacional
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {accessProfile?.company?.razao_social ?? perfil?.nome_empresa ?? 'Bem-vindo'}
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-sm">
            Gestao de Saude e Seguranca do Trabalho - Unidade: Matriz
          </p>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
            Perfil de acesso: {accessProfile?.role ?? 'empresa'}
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-500 transition-all">
            <div className="text-blue-500 font-bold text-[10px] uppercase mb-2">SST / eSocial</div>
            <h3 className="font-bold text-lg mb-1">Eventos S-2210 / S-2220</h3>
            <p className="text-slate-400 text-xs">Ultima transmissao realizada com sucesso.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all">
            <div className="text-emerald-500 font-bold text-[10px] uppercase mb-2">Conformidade</div>
            <h3 className="font-bold text-lg mb-1">PGR e PCMSO</h3>
            <p className="text-slate-400 text-xs">Documentacao tecnica dentro do prazo de validade.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 opacity-60">
            <div className="text-slate-400 font-bold text-[10px] uppercase mb-2">Saude</div>
            <h3 className="font-bold text-lg mb-1">Controle de ASOs</h3>
            <p className="text-slate-400 text-xs">Modulo em integracao com a rede credenciada.</p>
          </div>
        </div>

        <div className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] border-t border-slate-200 pt-6">
          NOVAVIX GO - Sistema de Gestao Ocupacional Integrado
        </div>
      </main>
    </div>
  )
}
