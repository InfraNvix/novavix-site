import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";
  const azulClaro = "#3B82F6";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">
      {/* BARRA SUPERIOR */}
      <div className="bg-slate-100 border-b border-slate-200 py-2 text-[11px] font-medium text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center gap-4">
          <span className="truncate">Soluções Inteligentes em Saúde e Segurança do Trabalho</span>
          <div className="flex gap-4 shrink-0">
            <span>ES - (27) 99265-5561</span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">contato@novavix.com.br</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="relative w-[180px] h-[50px]">
            <Image 
              src="/logo-novavix.png" 
              alt="Novavix" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          
          <div className="hidden lg:flex gap-8 text-[13px] font-bold uppercase tracking-wider text-slate-600">
            <Link href="#" className="hover:text-blue-600 transition-colors">Início</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Soluções</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Diferenciais</Link>
          </div>

          <Link 
            href="/login" 
            className="text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-md active:scale-95" 
            style={{ backgroundColor: azulNovavix }}
          >
            Acesso Restrito
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - FOCO NA IMAGEM OPERACIONAL */}
      <section className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="z-10">
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-8 text-slate-900 tracking-tight">
              A revolução digital na <br />
              <span style={{ color: azulClaro }}>Gestão de SST.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-xl leading-relaxed font-medium">
              Sua empresa em conformidade com o eSocial através do <strong style={{ color: azulNovavix }}>NOVAVIX GO</strong>: uma plataforma robusta, ágil e totalmente segura.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="https://wa.me/5527992655561?text=Olá, gostaria de entrar em contato sobre o NOVAVIX GO." 
                target="_blank"
                rel="noopener noreferrer"
                className="text-white px-10 py-5 rounded-2xl font-bold text-base uppercase transition-all shadow-xl hover:-translate-y-1 active:scale-95"
                style={{ backgroundColor: azulNovavix }}
              >
                Entrar em Contato
              </Link>
            </div>
          </div>
          
          {/* IMAGEM SEM BORDAS E COM ESMAECIMENTO */}
          <div className="relative group overflow-hidden rounded-[40px] transition-all duration-700 hover:shadow-2xl">
              <div className="relative w-full h-[350px] md:h-[500px] mask-gradient">
                <Image 
                  src="/logo-novavix-branca.png" // Nome do arquivo .png que você subiu
                  alt="Sistema NOVAVIX GO"
                  fill
                  className="object-cover object-center transition-transform group-hover:scale-105 duration-700"
                  priority
                />
                {/* Efeito de esmaecimento suave nas bordas para aderência ao fundo */}
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(255,255,255,0.8)] pointer-events-none"></div>
              </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { t: "Gestão eSocial", d: "Envio simplificado dos eventos SST com total segurança de dados." },
            { t: "Saúde Ocupacional", d: "Gestão completa de exames, ASOs e PCMSO integrado ao sistema." },
            { t: "Segurança do Trabalho", d: "PGR completo e laudos técnicos integrados aos demais módulos." },
            { t: "Portal do Cliente", d: "Acesso 24h a documentos possibilitando gestão de indicadores." },
            { t: "Treinamentos NRs", d: "Controle de vencimentos normativos e certificados. (EM DESENVOLVIMENTO)" },
            { t: "Financeiro Integrado", d: "Módulo financeiro com geração automatizada de boletos e notas." }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: i % 2 === 0 ? azulNovavix : azulClaro }}>
              <h3 className="text-lg font-bold mb-3 text-slate-800">{item.t}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-xs font-medium border-t border-slate-800 pt-8">
          © 2026 NOVAVIX SISTEMAS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
