import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* HEADER COM A LOGO OFICIAL */}
      <nav className="p-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="relative w-[220px] h-[60px]">
            <Image 
              src="/logo-novavix.png" 
              alt="Novavix Gestão Ocupacional" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <Link 
            href="/login" 
            className="text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md" 
            style={{ backgroundColor: azulNovavix }}
          >
            Portal do Cliente
          </Link>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL (HERO SECTION) */}
      <header className="max-w-6xl mx-auto px-6 py-24 text-center">
        <span 
          className="bg-blue-50 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8 inline-block"
          style={{ color: azulNovavix }}
        >
          SST Inteligente para todo o Brasil
        </span>
        
        <h1 className="text-5xl lg:text-7xl font-black mb-8 tracking-tight" style={{ color: azulNovavix }}>
          Segurança do Trabalho Digital
        </h1>
        
        <p className="text-xl text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed">
          Sua empresa em conformidade com as NRs e o eSocial em uma plataforma moderna, ágil e segura.
        </p>

        {/* BOTÃO WHATSAPP CORRIGIDO */}
        <Link 
          href="https://wa.me/5527992655561?text=Olá,%20vim%20pelo%20site%20da%20Novavix%20e%20gostaria%20de%20entrar%20em%20contato." 
          target="_blank"
          rel="noopener noreferrer"
          className="text-white px-12 py-5 rounded-2xl font-bold hover:scale-105 transition-all text-lg shadow-2xl inline-block"
          style={{ backgroundColor: azulNovavix }}
        >
          Entrar em Contato
        </Link>
      </header>

      {/* SEÇÃO DE DIFERENCIAIS RÁPIDOS */}
      <section className="bg-slate-50 py-20 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-3" style={{ color: azulNovavix }}>Gestão de eSocial</h3>
            <p className="text-slate-500 text-sm">Envio automatizado de eventos S-2210, S-2220 e S-2240.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-3" style={{ color: azulNovavix }}>Laudos Técnicos</h3>
            <p className="text-slate-500 text-sm">Emissão de PGR, PCMSO e LTCAT com rigor técnico nacional.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-3" style={{ color: azulNovavix }}>Portal 24h</h3>
            <p className="text-slate-500 text-sm">Documentação da sua empresa disponível para download a qualquer momento.</p>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
        © 2026 NOVAVIX - Gestão Ocupacional
      </footer>
    </div>
  );
}
