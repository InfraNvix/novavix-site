'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      // Busca os dados na tabela public.perfis usando a estrutura que você enviou
      const { data: perfilData } = await supabase
        .from('perfis')
        .select('nome_empresa, cnpj, email')
        .eq('id', user.id)
        .single();

      if (perfilData) {
        setPerfil(perfilData);
      }
    };

    getData();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.signOut();
    router.push('/login');
  };

  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-xs animate-pulse">
      Carregando NOVAVIX GO...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scale-90 lg:scale-100 origin-top">
      {/* HEADER DO SISTEMA */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="relative w-[140px] h-[40px]">
          <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black uppercase text-slate-900 leading-none">
              {perfil?.nome_empresa || 'Carregando...'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
              CNPJ: {perfil?.cnpj || '---'}
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

      {/* CONTEÚDO */}
      <main className="max-w-5xl mx-auto p-10">
        <header className="mb-10">
          <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Painel Operacional
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {perfil?.nome_empresa || 'Bem-vindo'}
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-sm">
            Gestão de Saúde e Segurança do Trabalho — Unidade: Matriz
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card eSocial */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-500 transition-all">
            <div className="text-blue-500 font-bold text-[10px] uppercase mb-2">SST / eSocial</div>
            <h3 className="font-bold text-lg mb-1">Eventos S-2210 / S-2220</h3>
            <p className="text-slate-400 text-xs">Última transmissão realizada com sucesso.</p>
          </div>

          {/* Card Documentos */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all">
            <div className="text-emerald-500 font-bold text-[10px] uppercase mb-2">Conformidade</div>
            <h3 className="font-bold text-lg mb-1">PGR & PCMSO</h3>
            <p className="text-slate-400 text-xs">Documentação técnica dentro do prazo de validade.</p>
          </div>

          {/* Card Exames */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 opacity-60">
            <div className="text-slate-400 font-bold text-[10px] uppercase mb-2">Saúde</div>
            <h3 className="font-bold text-lg mb-1">Controle de ASOs</h3>
            <p className="text-slate-400 text-xs">Módulo em integração com a rede credenciada.</p>
          </div>
        </div>

        {/* Footer interno informativo */}
        <div className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] border-t border-slate-200 pt-6">
          NOVAVIX GO • Sistema de Gestão Ocupacional Integrado
        </div>
      </main>
    </div>
  );
}
