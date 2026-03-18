'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 origin-top scale-90 lg:scale-100">
      
      {/* NAVBAR COMPACTA */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="relative w-[150px] h-[45px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <Link href="#produto" className="hover:text-blue-600 transition-colors">O Produto</Link>
            <Link href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</Link>
            <Link href="/login" className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-slate-200">
              Acesso Restrito
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - O IMPACTO */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Zap size={14} /> Inteligência em SST & eSocial
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8">
              Gestão Ocupacional <br /> 
              <span style={{ color: azulNovavix }}>sem burocracia.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[480px] mb-10">
              O **Novavix GO** centraliza seus eventos de SST, PGR e PCMSO em uma plataforma ágil, segura e 100% integrada ao eSocial.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="https://wa.me/5527992655561" className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                Solicitar Demonstração <ChevronRight size={18} />
              </Link>
              <Link href="/login" className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-600 px-8 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:border-blue-200 transition-all">
                Portal do Cliente
              </Link>
            </div>
          </div>

          {/* ÁREA VISUAL (REPRESENTAÇÃO DO SISTEMA) */}
          <div className="relative">
            <div className="bg-slate-100 rounded-[40px] aspect-video w-full overflow-hidden shadow-2xl border-[8px] border-white relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/10 to-transparent"></div>
              {/* Aqui entrará um print real do Dashboard depois */}
              <div className="flex items-center justify-center h-full text-slate-300 font-black uppercase tracking-widest text-xs">
                Preview Novavix GO Dashboard
              </div>
            </div>
            {/* Badge flutuante */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 hidden md:block animate-bounce-slow">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Status eSocial</p>
                  <p className="font-bold text-slate-900 leading-none">100% Conformidade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE DIFERENCIAIS RÁPIDOS */}
      <section id="produto" className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="text-blue-600"><Zap size={32} strokeWidth={3} /></div>
            <h4 className="font-bold text-xl">Agilidade no eSocial</h4>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Envio automatizado dos eventos S-2210, S-2220 e S-2240 com validação prévia.</p>
          </div>
          <div className="space-y-4">
            <div className="text-blue-600"><ShieldCheck size={32} strokeWidth={3} /></div>
            <h4 className="font-bold text-xl">Gestão de Documentos</h4>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">PGR e PCMSO sempre atualizados e disponíveis para download imediato no portal.</p>
          </div>
          <div className="space-y-4">
            <div className="text-blue-600"><BarChart3 size={32} strokeWidth={3} /></div>
            <h4 className="font-bold text-xl">Dashboards Técnicos</h4>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Visualize a saúde ocupacional da sua empresa com indicadores claros e objetivos.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
