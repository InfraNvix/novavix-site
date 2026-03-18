'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const azulNovavix = "#1E3A5F";

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    };
    getUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return null; // Proteção visual enquanto carrega

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scale-90 lg:scale-100 origin-top">
      {/* HEADER DO SISTEMA */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="relative w-[140px] h-[40px]">
          <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:inline">
            Usuário: <span className="text-slate-600">{user.email}</span>
          </span>
          <button 
            onClick={handleSignOut}
            className="text-[10px] font-black uppercase tracking-tighter text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
          >
            Sair do Sistema
          </button>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL COMPACTO */}
      <main className="max-w-5xl mx-auto p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bem-vindo ao NOVAVIX GO</h1>
          <p className="text-slate-500 mt-2 font-medium">Seu painel de gestão de SST e eSocial está pronto.</p>
        </header>

        {/* CARDS DE EXEMPLO DO SISTEMA */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-blue-500 font-bold text-[10px] uppercase mb-2">Módulo Ativo</div>
            <h3 className="font-bold text-lg mb-1">Eventos eSocial</h3>
            <p className="text-slate-500 text-sm">Status: 100% Sincronizado</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-emerald-500 font-bold text-[10px] uppercase mb-2">Documentação</div>
            <h3 className="font-bold text-lg mb-1">PGR / PCMSO</h3>
            <p className="text-slate-500 text-sm">Vencimentos: Em dia</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 opacity-60">
            <div className="text-slate-400 font-bold text-[10px] uppercase mb-2">Em Breve</div>
            <h3 className="font-bold text-lg mb-1">Treinamentos</h3>
            <p className="text-slate-500 text-sm">Módulo em desenvolvimento</p>
          </div>
        </div>

        <div className="mt-12 p-8 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
            <div>
                <h4 className="font-bold text-blue-900">Precisa de suporte técnico?</h4>
                <p className="text-blue-700 text-sm">Nossa equipe SST está online para te ajudar agora.</p>
            </div>
            <Link 
                href="https://wa.me/5527992655561" 
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-sm hover:shadow-md transition-all"
            >
                Abrir Chamado
            </Link>
        </div>
      </main>
    </div>
  );
}
