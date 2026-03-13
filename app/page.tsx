'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* 1. NAVEGAÇÃO */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="font-black text-2xl text-slate-800 tracking-tighter italic">NOVAVIX</div>
        <div className="hidden md:flex gap-8 text-sm font-bold text-slate-600 uppercase tracking-wide">
          <a href="#solucoes" className="hover:text-teal-600 transition">Soluções</a>
          <a href="#diferenciais" className="hover:text-teal-600 transition">Diferenciais</a>
          <a href="#contato" className="hover:text-teal-600 transition">Contato</a>
        </div>
        <Link 
          href="/login" 
          className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#0d9488] transition-all shadow-md shadow-teal-100"
        >
          Portal do Cliente
        </Link>
      </nav>

      {/* 2. HERO SECTION (Foco Nacional) */}
      <header className="max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8 shadow-sm">
          Inteligência em SST para todo o Brasil
        </span>
        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 mb-8 tracking-tight leading-[1.05]">
          Segurança do Trabalho <br />
          <span className="text-[#14b8a6]">Digital e Eficiente.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl leading-relaxed">
          Sua empresa em conformidade com as NRs e o eSocial em qualquer lugar do país. 
          Unimos consultoria técnica de excelência a uma plataforma exclusiva para gestão de laudos e documentos.
        </p>
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <button className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all text-lg shadow-2xl">
            Começar Agora
          </button>
          <button className="border-2 border-slate-200 text-slate-600 px-12 py-5 rounded-2xl font-bold hover:bg-slate-50 transition-all text-lg">
            Nossos Serviços
          </button>
        </div>
      </header>

      {/* 3. SEÇÃO DE SOLUÇÕES (Premissas do Produto) */}
      <section id="solucoes" className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6">Tudo em um só lugar</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Gerencie sua conformidade legal com tecnologia que simplifica processos complexos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:scale-[1.03] transition-all">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-8 text-teal-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Conformidade Legal</h3>
              <p className="text-slate-500 leading-relaxed">PGR, PCMSO, LTCAT e todos os envios necessários para o eSocial com rigor técnico nacional.</p>
            </div>

            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:scale-[1.03] transition-all">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-8 text-teal-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Portal de Documentos</h3>
              <p className="text-slate-500 leading-relaxed">Centralize seus laudos em nossa plataforma exclusiva com acesso seguro para seus clientes 24/7.</p>
            </div>

            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:scale-[1.03] transition-all">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-8 text-teal-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Agilidade Digital</h3>
              <p className="text-slate-500 leading-relaxed">Processos otimizados para que você foque no que importa: o crescimento da sua empresa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-10 gap-8">
          <div>
            <div className="font-black text-2xl text-slate-800 italic mb-2">NOVAVIX</div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">SST de alto impacto</p>
          </div>
          <div className="text-slate-400 text-sm text-center md:text-right font-medium">
            <p>© 2026 Novavix - Gestão de Segurança do Trabalho.</p>
            <p className="mt-1">Atendimento em todo o território nacional.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
