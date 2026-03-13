'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function PortalPage() {
const [user, setUser] = useState<any>(null)
const [loading, setLoading] = useState(true)
const router = useRouter()

useEffect(() => {
const getUser = async () => {
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
router.push('/login')
} else {
setUser(session.user)
}
setLoading(false)
}
getUser()
}, [router])

const handleLogout = async () => {
await supabase.auth.signOut()
router.push('/')
}

if (loading) return (
<div className="min-h-screen flex items-center justify-center bg-slate-50">
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
</div>
)

return (
<div className="min-h-screen bg-slate-50">
{/* HEADER DO PORTAL */}
<nav className="bg-white border-b border-slate-200 px-6 py-4">
<div className="max-w-7xl mx-auto flex justify-between items-center">
<div className="font-black text-xl text-slate-800 italic">NOVAVIX <span className="text-teal-600 not-italic font-medium text-sm ml-2">| Portal</span></div>
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

  {/* CONTEÚDO PRINCIPAL */}
  <main className="max-w-7xl mx-auto p-6 md:p-10">
    <header className="mb-10">
      <h1 className="text-3xl font-black text-slate-900 mb-2">Bem-vindo ao seu painel</h1>
      <p className="text-slate-500">Gerencie seus laudos, treinamentos e documentos de SST.</p>
    </header>

    {/* DASHBOARD GRID */}
    <div className="grid md:grid-cols-3 gap-6">
      {/* CARD DE DOCUMENTOS */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 text-teal-600">
          <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Meus Documentos</h3>
        <p className="text-slate-500 text-sm mb-6">Acesse PGR, PCMSO, LTCAT e demais laudos técnicos.</p>
        <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
          Visualizar Arquivos
        </button>
      </div>

      {/* CARD DE TREINAMENTOS */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
          <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Treinamentos</h3>
        <p className="text-slate-500 text-sm mb-6">Certificados de NR-01, NR-10, NR-35 e outros.</p>
        <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
          Ver Certificados
        </button>
      </div>

      {/* CARD DE SUPORTE */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
          <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Suporte Técnico</h3>
        <p className="text-slate-500 text-sm mb-6">Dúvidas sobre o eSocial ou NRs? Fale conosco.</p>
        <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
          Abrir Chamado
        </button>
      </div>
    </div>
  </main>
</div>
)
}
