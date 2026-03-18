import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";
  const azulClaro = "#3B82F6";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">
      {/* BARRA SUPERIOR DISCRETA */}
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

      {/* HEADER COMPACTO */}
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

      {/* HERO SECTION REFORMULADA - COMPACTA E LIMPA */}
      <section className="relative bg-slate-50 py-16 lg:py-20 overflow-hidden border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.2fr,1fr] gap-12 items-center">
          
          {/* COLUNA DO TEXTO À ESQUERDA - REPOSICIONADA E COMPACTADA */}
          <div className="z-10">
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-6 text-slate-900 tracking-tight">
              Gestão de <span style={{ color: azulClaro }}>SST e eSocial</span> <br />
              com tecnologia de ponta.
            </h1>
            <p className="text-base text-slate-600 mb-8 max-w-xl leading-relaxed font-medium">
              <strong style={{ color: azulNovavix }}>NOVAVIX GO</strong>: a sua próxima plataforma de gestão especializada para PGR, PCMSO e envio automático de eventos ao eSocial. Segurança jurídica e eficiência para sua empresa.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="https://wa.me/5527992655561?text=Olá, gostaria de conhecer as soluções da Novavix." 
                target="_blank"
                rel="noopener noreferrer"
                className="text-white px-8 py-4 rounded-lg font-bold text-sm uppercase transition-all shadow-lg hover:-translate-y-1 active:scale-95"
                style={{ backgroundColor: azulNovavix }}
              >
                Entrar em Contato
              </Link>
              <button className="border-2 border-slate-300 text-slate-600 px-8 py-4 rounded-lg font-bold text-sm uppercase hover:bg-white hover:border-slate-400 hover:text-slate-800 transition-all active:scale-95">
                Nossas Soluções
              </button>
            </div>
          </div>
          
          {/* COLUNA DA IMAGEM - SEM A CAIXA GIGANTE E DO TAMANHO CORRETO */}
          <div className="relative flex items-center justify-center lg:justify-end overflow-hidden p-4 rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {/* O container agora respeita o tamanho da figura */}
              <div className="relative w-full h-[280px] md:h-[350px]">
                <Image 
                  src="/logo-novavix-branca.png" // Certifique-se que o nome no Git é este!
                  alt="NOVAVIX GO - Gestão Ocupacional"
                  fill
                  className="object-contain object-center transition-transform hover:scale-105 duration-500"
                  priority
                />
              </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS EM GRID COMPACTO */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Soluções Completas</h2>
          <div className="h-1.5 w-20 bg-blue-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { t: "Gestão eSocial", d: "Envio simplificado dos eventos SST com total segurança de dados." },
            { t: "Saúde Ocupacional", d: "Gestão completa de exames, ASOs e PCMSO integrado ao sistema de gestão." },
            { t: "Segurança do Trabalho", d: "PGR completo técnicos integrado aos demais módulos." },
            { t: "Portal do Cliente", d: "Acesso 24h a documentos do seu cliente possibilitando gestão de seus indicadores de conformidade." },
            { t: "Treinamentos NRs", d: "Controle e gestão de vencimentos de treinamentos normativos e certificados. (EM DESENVOLVIMENTO)" },
            { t: "Financeiro", d: "Módulo de gestão financeira integrado com toda plataforma, com geração automatizada de boletos e notas fiscais." }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: i % 2 === 0 ? azulNovavix : azulClaro }}>
              <h3 className="text-lg font-bold mb-3 text-slate-800">{item.t}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RODAPÉ TIPO COMPACTO E PROFISSIONAL */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 text-sm">
          <div className="col-span-1 md:col-span-1">
            <div className="relative w-[150px] h-[40px] mb-6 brightness-0 invert">
              <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
            </div>
            <p className="text-slate-400">Transformando a gestão de SST através da tecnologia e expertise técnica.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-blue-400">Links Rápidos</h4>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="#" className="hover:text-white transition-colors">Sobre Nós</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Portal do Cliente</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-blue-400">Contato</h4>
            <p className="text-slate-300">Espírito Santo, Brasil<br />(27) 99265-5561</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs font-medium">
          © 2026 NOVAVIX SISTEMAS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
