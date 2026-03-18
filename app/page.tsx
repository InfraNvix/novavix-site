import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";

  return (
    <div className="min-h-screen font-sans" style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)" }}>
      {/* DETALHE DE TOPO - LINHA DE DESTAQUE */}
      <div className="h-1 w-full" style={{ backgroundColor: azulNovavix }}></div>

      {/* HEADER REFINADO */}
      <nav className="p-8 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="relative w-[240px] h-[65px] transition-transform hover:scale-105">
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
            className="text-white px-10 py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg active:scale-95" 
            style={{ backgroundColor: azulNovavix }}
          >
            Portal do Cliente
          </Link>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL (HERO) COM TEXTO MAIS IMPACTANTE */}
      <header className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-[11px] font-bold uppercase tracking-[0.25em] px-6 py-3 rounded-full mb-10 shadow-sm">
           <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
           SST Inteligente & Digital
        </div>
        
        <h1 className="text-6xl lg:text-8xl font-black mb-10 tracking-tighter leading-tight" style={{ color: azulNovavix }}>
          Segurança do Trabalho <br />
          <span className="text-blue-600/80">de Alto Nível.</span>
        </h1>
        
        <p className="text-xl text-slate-600/80 mb-14 max-w-2xl mx-auto leading-relaxed font-medium">
          Sua empresa em conformidade com as NRs e o eSocial através de uma plataforma robusta, ágil e totalmente segura.
        </p>

        {/* BOTÃO DE CONTATO PREMIUM */}
        <Link 
          href="https://wa.me/5527992655561?text=Olá,%20vim%20pelo%20site%20da%20Novavix%20e%20gostaria%20de%20entrar%20em%20contato." 
          target="_blank"
          rel="noopener noreferrer"
          className="group relative text-white px-14 py-6 rounded-3xl font-bold transition-all text-xl shadow-[0_20px_50px_rgba(30,58,95,0.3)] hover:shadow-[0_25px_60px_rgba(30,58,95,0.4)] active:scale-95 overflow-hidden"
          style={{ backgroundColor: azulNovavix }}
        >
          <span className="relative z-10">Entrar em Contato</span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </Link>
      </header>

      {/* CARDS COM DESIGN SOFISTICADO */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
          {[
            { t: "Gestão de eSocial", d: "Automação total dos eventos S-2210, S-2220 e S-2240 com validação técnica." },
            { t: "Engenharia & Saúde", d: "Emissão de PGR, PCMSO e LTCAT com foco em redução de passivo trabalhista." },
            { t: "Ecossistema Digital", d: "Centralização completa de documentos e treinamentos em um portal exclusivo 24h." }
          ].map((item, i) => (
            <div key={i} className="group bg-white p-12 rounded-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 hover:border-blue-200 transition-all hover:-translate-y-2">
              <div className="w-12 h-1 w-full bg-slate-100 mb-8 group-hover:bg-blue-500 transition-colors"></div>
              <h3 className="text-2xl font-bold mb-5" style={{ color: azulNovavix }}>{item.t}</h3>
              <p className="text-slate-500 text-base leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RODAPÉ DISCRETO E ELEGANTE */}
      <footer className="py-20 border-t border-slate-100 text-center bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="opacity-40 grayscale hover:grayscale-0 transition-all w-32 relative h-10">
             <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain" />
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">
            © 2026 NOVAVIX SISTEMAS - Tecnologia em Saúde & Segurança
          </p>
        </div>
      </footer>
    </div>
  );
}
