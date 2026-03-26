'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { DEMO_COMPANY_AUTH, DEMO_MODE_ENABLED } from '@/lib/auth/demo'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function PortalPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = useMemo(() => {
    if (DEMO_MODE_ENABLED) {
      return null
    }
    return getSupabaseBrowserClient()
  }, [])

  useEffect(() => {
    if (DEMO_MODE_ENABLED) {
      setUser({
        id: 'demo-legacy-user',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: DEMO_COMPANY_AUTH.email,
      } as User)
      setLoading(false)
      return
    }

    if (!supabase) {
      router.push('/login')
      setLoading(false)
      return
    }

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        setLoading(false)
        return
      }

      setUser(session.user)
      setLoading(false)
    }

    void getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    if (DEMO_MODE_ENABLED) {
      await fetch('/api/auth/demo-logout', { method: 'POST' })
      router.push('/login')
      return
    }

    if (!supabase) {
      router.push('/login')
      return
    }

    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-bold uppercase tracking-wider px-6 py-3 text-center">
        Modulo legado em manutencao. Utilize o painel principal em /dashboard.
      </div>

      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl text-slate-800 italic">
            NOVAVIX <span className="text-teal-600 not-italic font-medium text-sm ml-2">| Portal Legado</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden md:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Bem-vindo ao seu painel legado</h1>
          <p className="text-slate-500">Gerencie seus laudos, treinamentos e documentos de SST.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Meus Documentos</h3>
            <p className="text-slate-500 text-sm mb-6">Acesse PGR, PCMSO, LTCAT e demais laudos tecnicos.</p>
            <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
              Visualizar Arquivos
            </button>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Treinamentos</h3>
            <p className="text-slate-500 text-sm mb-6">Certificados de NR-01, NR-10, NR-35 e outros.</p>
            <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
              Ver Certificados
            </button>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Suporte Tecnico</h3>
            <p className="text-slate-500 text-sm mb-6">Duvidas sobre eSocial ou NRs? Fale conosco.</p>
            <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
              Abrir Chamado
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
