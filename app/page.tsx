import Link from 'next/link';
import Image from 'next/image';
import { createClient } from 'next-sanity';

const client = createClient({
  projectId: 'SEU_PROJECT_ID_AQUI', 
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false, 
});

async function getLandingData() {
  const query = `*[_type == "landingPage"][0]{
    tituloHero,
    subtituloHero,
    servicos[] { titulo, descricao }
  }`;
  return await client.fetch(query);
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="min-h-screen bg-white font-sans text-[#1E3A5F]">
      {/* NAVEGAÇÃO COM LOGO */}
     <nav className="p-6 bg-white border-b border-slate-100 shadow-sm">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
    {/* LOGO OFICIAL NOVAVIX */}
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
      className="bg-[#1E3A5F] text-white px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all text-sm shadow-lg shadow-blue-900/10"
    >
      Portal do Cliente
    </Link>
  </div>
</nav>

      {/* HERO SECTION */}
      <header className="max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <span className="bg-emerald-50 text-[#00A859] text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8">
          Inteligência em SST para todo o Brasil
        </span>
        <h1 className="text-5xl lg:text-7xl font-black text-[#1E3A5F] mb-8 tracking-tight">
          {data?.tituloHero || "Segurança do Trabalho Digital"}
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl">
          {data?.subtituloHero || "Sua empresa em conformidade com as NRs e o eSocial."}
        </p>
        <Link 
          href="https://wa.me/5527999999999" 
          className="bg-[#1E3A5F] text-white px-12 py-5 rounded-2xl font-bold hover:bg-opacity-90 transition-all text-lg shadow-2xl"
        >
          Começar Agora
        </Link>
      </header>

      {/* SERVIÇOS COM CORES NOVAVIX */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {(data?.servicos || []).map((servico: any, index: number) => (
            <div key={index} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 text-[#00A859] font-bold">
                {index + 1}
              </div>
              <h3 className="text-2xl font-bold text-[#1E3A5F] mb-4">{servico.titulo}</h3>
              <p className="text-slate-500">{servico.descricao}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
