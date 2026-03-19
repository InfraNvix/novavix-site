import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight, LayoutDashboard } from 'lucide-react';
import { createClient } from 'next-sanity';

// 1. Cliente Sanity
const client = createClient({
  projectId: '70qpcg23',
  dataset: 'production',
  apiVersion: '2024-03-19',
  useCdn: false,
});

export default async function HomePage() {
  // 2. Busca de dados simplificada diretamente dentro da função
  const data = await client.fetch(`*[_type == "landingPage"][0]{tituloPrincipal, subtitulo}`);

  // 3. Garantia de que as variáveis existem (Fallbacks)
  const displayTitle = data?.tituloPrincipal || "Gestão Ocupacional sem burocracia.";
  const displaySubtitle = data?.subtitulo || "O Novavix GO centraliza seus eventos de SST, PGR e PCMSO em uma plataforma ágil, segura e 100% integrada ao eSocial.";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 origin-top scale-90 lg:scale-100">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="relative w-[150px] h-[45px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#tecnologia" className="hover:text-blue-600 transition-colors">Tecnologia</a>
            <Link href="/login" className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-slate-200 ml-4">
              Acesso Restrito
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Zap size={14} /> Inteligência em SST & eSocial
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8 whitespace-pre-line">
              {displayTitle}
            </h1>

            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[480px] mb-10">
              {displaySubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="https://wa.me/5527992655561" className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                Solicitar Demonstração <ChevronRight size={18} />
              </Link>
              <a href="#solucoes" className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-500 px-8 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:border-blue-200 transition-all">
                Conhecer Soluções
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-slate-900 rounded-[40px] aspect-video w-full overflow-hidden shadow-2xl border-[8px] border-white relative group flex flex-col items-center justify-center p-12">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 border border-blue-500/30">
                  <LayoutDashboard size={32} />
                </div>
                <p className="text-white/60 font-black uppercase tracking-[0.4em] text-[10px]">Novavix GO</p>
                <div className="h-[2px] w-12 bg-blue-500/40 my-3"></div>
                <p className="text-white/20 font-medium text-[11px] italic">Interface de Gestão em Homologação</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUÇÕES */}
      <section id="solucoes" className="py-24 bg-slate-50/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">O que entregamos</h2>
            <div className="h-1 w-20 bg-blue-600 mt-2"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="text-blue-600"><Zap size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight">Agilidade no eSocial</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Envio automatizado dos eventos S-2210, S-2220 e S-2240.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><ShieldCheck size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight">Gestão de Documentos</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">PGR e PCMSO sempre atualizados.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><BarChart3 size={32} strokeWidth={3} /></div>
              <h4 className="font-bold text-xl tracking-tight">Dashboards Técnicos</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Indicadores claros e objetivos em tempo real.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
