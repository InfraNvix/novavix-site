import Link from 'next/link';
import { createClient } from 'next-sanity';

// Configuração do cliente para buscar dados
const client = createClient({
  projectId: '70qpcg23',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function getLandingData() {
  const query = `*[_type == "landingPage"][0]{
    tituloHero,
    subtituloHero,
    servicos[] {
      titulo,
      descricao
    }
  }`;
  return await client.fetch(query);
}

export default async function HomePage() {
  const data = await getLandingData();

  // Caso você ainda não tenha publicado nada no Sanity, ele usará estes textos como padrão (Fallback)
  const content = {
    titulo: data?.tituloHero || "Segurança do Trabalho Digital e Eficiente",
    descricao: data?.subtituloHero || "Sua empresa em conformidade com as NRs e o eSocial em qualquer lugar do país.",
    servicos: data?.servicos || [
      { titulo: "Conformidade Legal", descricao: "PGR, PCMSO e LTCAT com rigor técnico nacional." },
      { titulo: "Portal de Documentos", descricao: "Centralize seus laudos em nossa plataforma exclusiva." },
      { titulo: "Agilidade Digital", descricao: "Processos otimizados para o crescimento da sua empresa." }
    ]
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* NAVEGAÇÃO */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="font-black text-2xl text-slate-800 tracking-tighter italic">NOVAVIX</div>
        <Link 
          href="/login" 
          className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#0d9488] transition-all shadow-md shadow-teal-100"
        >
          Portal do Cliente
        </Link>
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8 shadow-sm">
          Inteligência em SST para todo o Brasil
        </span>
        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 mb-8 tracking-tight leading-[1.05]">
          {content.titulo}
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl leading-relaxed">
          {content.descricao}
        </p>
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <button className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all text-lg shadow-2xl">
            Começar Agora
          </button>
        </div>
      </header>

      {/* SEÇÃO DE SERVIÇOS */}
      <section className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {content.servicos.map((servico: any, index: number) => (
              <div key={index} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{servico.titulo}</h3>
                <p className="text-slate-500 leading-relaxed">{servico.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 text-center">
        <p className="text-slate-400 text-sm font-medium">© 2026 Novavix - Atendimento em todo o território nacional.</p>
      </footer>
    </div>
  );
}
