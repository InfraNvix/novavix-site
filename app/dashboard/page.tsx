'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    const getData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email ?? 'usuario@novavix.local')
    }

    void getData()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
          <p className="text-[11px] font-bold text-slate-500 hidden md:block">{userEmail}</p>
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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            Painel NOVAVIX GO
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-sm">
            Acesse os modulos operacionais e de analytics.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <button onClick={() => router.push('/dashboard/copsoq')} className="text-left bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">COPSOQ</p>
            <p className="text-lg font-bold mt-2">Visao Coletiva</p>
          </button>
          <button onClick={() => router.push('/dashboard/analytics')} className="text-left bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Analytics</p>
            <p className="text-lg font-bold mt-2">BI Psicossocial</p>
          </button>
          <button onClick={() => router.push('/dashboard/admin')} className="text-left bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-700">Administracao</p>
            <p className="text-lg font-bold mt-2">Setup e Operacoes</p>
          </button>
        </section>
      </main>
    </div>
  )
}
