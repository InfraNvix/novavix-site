'use client'

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight, FileText, DollarSign, Eye } from 'lucide-react';
import { useState } from 'react';

// =================================================================
// 1. CONFIGURAÇÃO DOS TEXTOS PRINCIPAIS (SEO)
// =================================================================
const SEO_CONTENT = {
  title: 'Software de Gestão de SST e eSocial: Segurança do Trabalho Digital',
  subtitle: 'O NOVAVIX GO centraliza e automatiza seus eventos de SST, PGR e PCMSO com foco em conformidade e agilidade.',
};

// =================================================================
// 2. BANCO DE DADOS LOCAL DO BLOG
// =================================================================
const POSTS_LOCAIS = [
  {
    _id: '1',
    tituloPost: 'Riscos Psicossociais NR1- MTE lança manual de orientação',
    slug: 'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/2026/marco/mte-lanca-manual-para-orientar-gestao-de-riscos-ocupacionais-nas-empresas',
    data: '30/03/2026',
    imagemUrl: '/logo_psico.png', 
    resumoPost: 'O MTE lançou no último dia 16/03/2026 o manual para orientar gestão de riscos ocupacionais nas empresas. Sua Empresa ainda tem dificuldades com o mapeamento dos riscos conforme nova NR1? O NOVAVIX GO tem a solução mais simples e eficaz para sua gestão!'
  },
  {
    _id: '2',
    tituloPost: 'Fiscalização de Segurança e Saúde no Trabalho',
    slug: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho',
    data: '30/03/2026',
    imagemUrl: '/logo_inspe.png',
    resumoPost: 'Nos dias atuais sua empresa não pode estar sujeita a processos demorados e burocráticos, pois irá perder competitividade e eficácia, além de ficar exposto a fiscalizações legais. O NOVAVIX GO te auxiliará em todo processo! Entre em contato.'
  },
  {
    _id: '3',
    tituloPost: 'Novidades na legislação de SST para 2026',
    slug: 'https://wa.me/5527992655561',
    data: '25/03/2026',
    imagemUrl: '/logo_nr.png', 
    resumoPost: 'Fique por dentro das atualizações das NRs e como o Novavix GO já está preparado para as mudanças.'
  }
];

export default function HomePage() {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 origin-top scale-90 lg:scale-100">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="relative w-[150px] h-[45px] block">
              <Image 
                src="/logo-novavix.png" 
                alt="Novavix - Software de Gestão de Segurança do Trabalho" 
                fill 
                className="object-contain object-left" 
                priority 
              />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#blog" className="hover:text-blue-600 transition-colors">Blog</a>
            <Link 
              href="/" 
              className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-slate-200 ml-4"
            >
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
              <Zap size={14} /> Sistema de Gestão de SST Online
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8 whitespace-pre-line uppercase italic">
              {SEO_CONTENT.title}
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[480px] mb-10">
              {SEO_CONTENT.subtitle}
            </p>
            <Link 
              href="https://wa.me/5527992655561" 
              className="inline-flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 w-fit"
            >
              Solicitar Demonstração <ChevronRight size={18} />
            </Link>
          </div>

          <div className="relative group p-6 bg-slate-50 border border-slate-100 rounded-[40px] shadow-sm">
            <div className="rounded-3xl aspect-video w-full overflow-hidden shadow-md relative bg-white flex items-center justify-center p-8 mb-8">
              <Image 
                src="/logo_nvixgo.png" 
                alt="Novavix GO - Plataforma de Saúde e Segurança Ocupacional" 
                fill 
                className="object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="text-center px-4">
              <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-[10px]">Novavix GO</p>
              <div className="h-[2px] w-12 bg-blue-500 my-3 mx-auto" />
              <p className="text-slate-500 font-medium text-[12px] leading-relaxed max-w-sm mx-auto">
                O NOVAVIX GO é um sistema completo de gestão para empresas do setor de Saúde, Segurança e Higiene Ocupacional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUÇÕES */}
      <section id="solucoes" className="py-24 bg-slate-50/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 flex flex-row justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                Soluções Completas para SST e eSocial
              </h2>
              <div className="h-1 w-20 bg-blue-600 mt-4" />
            </div>
            <a href="#" onClick={scrollToTop} className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-slate-900 transition-all bg-white px-4 py-2 rounded-full border border-blue-100 shadow-sm">
              <span className="group-hover:-translate-y-0.5 transition-transform text-lg">↑</span> VOLTAR AO INÍCIO
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            <div className="space-y-4">
              <div className="text-blue-600"><Zap size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Mensageria eSocial SST</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Envio automatizado dos eventos <strong> S-2220, S-2240 e S-2241</strong> para total conformidade.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><ShieldCheck size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Emissão de PGR e PCMSO</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Geração de documentos base, inventários de riscos e cronogramas integrados.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><BarChart3 size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Gestão Ocupacional</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Indicadores estratégicos em tempo real para controle total da saúde ocupacional.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><FileText size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Prontuário, Exames e ASO</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Formulários customizáveis para atender às necessidades da sua clínica e ASO com assinatura digital</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><DollarSign size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Faturamento Integrado</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Integração automática entre os atendimentos e o faturamento de serviços.</p>
            </div>
            <div className="space-y-4">
              <div className="text-blue-600"><Eye size={32} strokeWidth={3} /></div>
              <h3 className="font-bold text-xl tracking-tight uppercase">Portal do Cliente</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Transparência total para seu cliente acompanhar documentos e envios em tempo real.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section id="blog" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 flex flex-row justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Notícias e Novidades SST</h2>
              <div className="h-1 w-20 bg-blue-600 mt-4" />
            </div>
            <a href="#" onClick={scrollToTop} className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-slate-900 transition-all bg-slate-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
              <span className="group-hover:-translate-y-0.5 transition-transform text-lg">↑</span> VOLTAR AO INÍCIO
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {POSTS_LOCAIS.map((post) => (
              <div key={post._id} className="bg-white rounded-3xl p-6 border border-slate-100 group shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-6 bg-slate-50">
                  <Image 
                    src={post.imagemUrl} 
                    alt={post.tituloPost} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-300" 
                    onError={(e: any) => { e.target.src = "https://via.placeholder.com/400x250?text=Novavix+Blog" }}
                  />
                </div>
                <h4 className="font-bold text-lg tracking-tight text-slate-900 mb-2 leading-tight">{post.tituloPost}</h4>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow font-medium">{post.resumoPost}</p>
                <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{post.data}</p>
                  <Link href={post.slug} target="_blank" className="text-blue-600 font-bold text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1">
                    Saiba mais <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2026 Novavix Sistemas - Gestão SST Inteligente e eSocial
        </p>
      </footer>
    </div>
  );
}
