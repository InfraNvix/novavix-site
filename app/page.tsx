import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";
  const azulClaro = "#3B82F6";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">
      {/* BARRA SUPERIOR - MAIS COMPACTA */}
      <div className="bg-slate-100 border-b border-slate-200 py-1.5 text-[10px] font-medium text-slate-500">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center gap-4">
          <span className="truncate uppercase tracking-wider">Soluções Inteligentes em Saúde e Segurança do Trabalho</span>
          <div className="flex gap-4 shrink-0">
            <span>ES - (27) 99265-5561</span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">contato@novavix.com.br</span>
          </div>
        </div>
      </div>

      {/* HEADER - ALTURA REDUZIDA */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="relative w-[150px] h-[40px]">
            <Image 
              src="/logo-novavix.png" 
              alt="Novavix" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          
          <div className="hidden lg:flex gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <Link href="#" className="hover:text-blue-600 transition-colors">Início</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Soluções</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Diferenciais</Link>
          </div>

          <Link 
            href="/login" 
            className="text-white px-5 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-md active:scale-95" 
            style={{ backgroundColor: azulNovavix }}
          >
            Acesso Restrito
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - ESCALADA PARA ~85% */}
      <section className="relative bg-white py-12 lg:py-16 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
          
          <div className="z-10">
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-6 text-slate-900 tracking-tight">
              A revolução digital na <br />
              <span style={{ color: azulClaro }}>Gestão de SST.</span>
            </h1>
            <p className="text-base text-slate-600 mb-8 max-w-md leading-relaxed">
              Sua empresa em conformidade com o eSocial através do <strong style={{ color: azulNovavix }}>NOVAVIX GO</strong>: uma plataforma robusta, ágil e totalmente segura.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="https://wa.me/5527992655561?text=Olá, gostaria de entrar em contato sobre o NOVAVIX GO." 
                target="_blank"
                rel="noopener noreferrer"
                className="text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase transition-all shadow-lg hover:-translate-y-1 active:scale-95"
                style={{ backgroundColor: azulNovavix }}
              >
                Entrar em Contato
              </Link>
            </div>
          </div>
          
          {/* IMAGEM COM MÁSCARA DE ESMAECIMENTO */}
          <div className="relative group overflow-hidden rounded-[32px] transition-all duration-700">
              <div className="relative w-full h-[300px] md:h-[400px]">
                <Image 
                  src="/logo-novavix-branca.png" 
                  alt="Sistema NOVAVIX GO"
                  fill
                  className="object-cover object-center transition-transform group-hover:scale-105 duration-700"
                  priority
                />
                {/* Esmaecimento suave nas bordas para integração total ao fundo branco */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(255,255,255,0.7)]"></div>
              </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS - GRID MAIS COMPACTO */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { t: "Gestão eSocial", d: "Envio simplificado dos eventos SST com total segurança de dados." },
            { t: "Saúde Ocupacional", d: "Gestão completa de exames e ASOs integrado ao sistema." },
            { t: "Segurança do Trabalho", d: "PGR e laudos técnicos integrados aos demais módulos." },
            { t: "Portal do Cliente", d: "Acesso 24h possibilitando gestão de indicadores." },
            { t: "Treinamentos NRs", d: "Gestão de vencimentos normativos e certificados. (BREVE)" },
            { t: "Financeiro Integrado", d: "Geração automatizada de boletos e notas fiscais." }
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: i % 2 === 0 ? azulNovavix : azulClaro }}>
              <h3 className="text-base font-bold mb-2 text-slate-800">{item.t}</h3>
              <p className="text-slate-500 text-[13px] leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RODAPÉ DISCRETO */}
      <footer className="bg-slate-900 text-white py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                © 2026 NOVAVIX SISTEMAS. Todos os direitos reservados.
            </p>
        </div>
      </footer>
    </div>
  );
}
