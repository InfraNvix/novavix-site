'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* 1. NAVEGAÇÃO */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="font-black text-2xl text-slate-800 tracking-tighter">NOVAVIX</div>
        <div className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
          <a href="#servicos" className="hover:text-teal-600 transition">Serviços</a>
          <a href="#sobre" className="hover:text-teal-600 transition">Sobre</a>
          <a href="#contato" className="hover:text-teal-600 transition">Contato</a>
        </div>
        <Link 
          href="/login" 
          className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#0d9488] transition-all shadow-md shadow-teal-100"
        >
          Portal do Cliente
        </Link>
      </nav>

      {/* 2. HERO SECTION (O que você faz e para quem) */}
      <header className="max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <span className="bg-teal-50 text-teal-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
          Gestão de SST em Santa Teresa - ES
        </span>
        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 mb-8 tracking-tight leading-[1.1]">
          Segurança do Trabalho <br />
          <span className="text-[#14b8a6]">Sem Burocracia.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl leading-relaxed">
          Protegemos sua empresa e seus colaboradores com laudos técnicos precisos, 
          treinamentos especializados e uma plataforma digital exclusiva para seus documentos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all text-lg shadow-xl">
            Solicitar Orçamento
          </button>
          <button className="border-2 border-slate-200 text-slate-600 px-10 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all text-lg">
            Ver Serviços
          </button>
        </div>
      </header>

      {/* 3. SEÇÃO DE SERVIÇOS (As premissas do seu produto) */}
      <section id="servicos" className="bg-slate-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Soluções Completas em SST</h2>
            <p className="text-slate-500 font-medium">Tudo o que sua empresa precisa para estar em dia com as normas regulamentadoras.</p>
          </div>

          <div className="grid md:grid-rows-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 text-teal-600 font-bold">01</div>
              <h3 className="text-xl font-black text-slate-800 mb-4">Laudos Técnicos</h3>
              <p className="text-slate-500 leading-relaxed">Elaboração de PGR, PCMSO, LTCAT e envios para o eSocial com precisão técnica absoluta.</p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 text-teal-600 font-bold">02</div>
              <h3 className="text-xl font-black text-slate-800 mb-4">Treinamentos</h3>
              <p className="text-slate-500 leading-relaxed">Capacitação de equipes conforme as NRs, garantindo a segurança real no ambiente de trabalho.</p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 text-teal-600 font-bold">03</div>
              <h3 className="text-xl font-black text-slate-800 mb-4">Portal Digital</h3>
              <p className="text-slate-500 leading-relaxed">Acesso exclusivo para clientes visualizarem e baixarem seus laudos 24h por dia via nossa plataforma.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-black text-xl text-slate-400">NOVAVIX</div>
          <p className="text-slate-400 text-sm">© 2026 Novavix - Consultoria em Segurança do Trabalho. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
