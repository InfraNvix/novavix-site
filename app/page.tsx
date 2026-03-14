import Link from 'next/link';
import Image from 'next/image';
import { createClient } from 'next-sanity';

// 1. Configuração do Cliente (USE SEU ID DO SANITY AQUI)
const client = createClient({
  projectId: '70qpcg23', // Troque pelo ID que está no seu painel do Sanity
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false, 
});

async function getLandingData() {
  try {
    const query = `*[_type == "landingPage"][0]{
      tituloHero,
      subtituloHero,
      servicos[] { titulo, descricao }
    }`;
    return await client.fetch(query);
  } catch (e) {
    return null; // Caso o Sanity falhe, ele usa os textos padrão abaixo
  }
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="min-h-screen bg-white font-sans text-[#1E3A5F]">
      {/* NAVEGAÇÃO COM LOGO - AQUI ENTRA A SUA MARCA */}
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
            className="bg-[#1E3A5F] text-white px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all text-sm shadow-lg shadow-blue-900/10"
          >
            Portal do Cliente
          </Link>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL - FOCO NACIONAL */}
      <header className="max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <span className="bg-blue-50 text-[#1E3A5F] text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-8">
          SST Inteligente para todo o Brasil
        </span>
        <h1 className="text-5xl lg:text-7xl font-black text-[#1E3A5F] mb-8 tracking-tight">
          {data?.tituloHero || "Segurança do Trabalho Digital"}
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl leading-relaxed">
          {data?.subtituloHero || "Sua empresa em conformidade com as NRs e o eSocial em uma plataforma moderna e ágil."}
        </p>
        <Link 
          href="https://wa.me/5527999999999" 
          className="bg-[#1E3A5F] text-white px-12 py-5 rounded-2xl font-bold hover:bg-opacity-80 transition-all text-lg shadow-2xl"
        >
          Solicitar Consultoria
        </Link>
      </header>

      {/* SEÇÃO DE SERVIÇOS */}
      <section className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {(data?.servicos || [
            { titulo: "Gestão de NRs", descricao: "PGR, PCMSO e LTCAT com emissão rápida e segura." },
            { titulo: "eSocial", descricao: "Envio de eventos S-2210, S-2220 e S-2240 sem complicações." },
            { titulo: "Portal do Cliente", descricao: "Acesso 24h aos documentos e certificados da sua empresa." }
          ]).map((servico: any, index: number) => (
            <div key={index} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-bold text-[#1E3A5F] mb-4">{servico.titulo}</h3>
              <p className="text-slate-500 leading-relaxed">{servico.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
        © 2026 NOVAVIX - Gestão Ocupacional Nacional
      </footer>
    </div>
  );
}
