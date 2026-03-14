import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  // Cores oficiais da sua marca
  const azulNovavix = "#1E3A5F";

  const content = {
    titulo: "Segurança do Trabalho Digital",
    descricao: "Sua empresa em conformidade com as NRs e o eSocial em uma plataforma moderna, ágil e com atendimento nacional.",
    servicos: [
      { titulo: "Conformidade Legal", descricao: "PGR, PCMSO e LTCAT com rigor técnico e emissão digital." },
      { titulo: "Portal de Documentos", descricao: "Centralize seus laudos com acesso exclusivo para sua empresa." },
      { titulo: "Gestão de eSocial", descricao: "Envio simplificado dos eventos de SST para o governo." }
    ]
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: azulNovavix }}>
      {/* NAV COM LOGO CORRIGIDA */}
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
            className="text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all text-sm shadow-lg"
            style={{ backgroundColor: azulNovavix }}
          >
            Portal do Cliente
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <span className="bg-blue-50 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8" style={{ color: azulNovavix }}>
          SST Inteligente para todo o Brasil
        </span>
        <h1 className="text-5xl lg:text-7xl font-black mb-8 tracking-tight" style={{ color: azulNovavix }}>
          {content.titulo}
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl leading-relaxed">
          {content.descricao}
        </p>
        <Link 
          href="https://wa.me/5527999999999" 
          className="text-white px-12 py-5 rounded-2xl font-bold hover:bg-opacity-80 transition-all text-lg shadow-2xl"
          style={{ backgroundColor: azulNovavix }}
        >
          Falar com Especialista
        </Link>
      </header>

      {/* SEÇÃO DE SERVIÇOS */}
      <section className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {content.servicos.map((servico, index) => (
            <div key={index} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-bold mb-4" style={{ color: azulNovavix }}>{servico.titulo}</h3>
              <p className="text-slate-500 leading-relaxed">{servico.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
        © 2026 NOVAVIX - Gestão Ocupacional
      </footer>
    </div>
  );
}
