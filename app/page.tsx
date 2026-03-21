import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight, LayoutDashboard, Rss } from 'lucide-react';
import { createClient } from 'next-sanity';

// 1. CONFIGURAÇÕES DE FORÇA BRUTA (ANTI-CACHE)
// Estas linhas garantem que o Render busque dados novos a cada acesso.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const client = createClient({
  projectId: '70qpcg23',
  dataset: 'production',
  apiVersion: '2024-03-19',
  useCdn: false, // Busca direta no banco para evitar dados antigos
});

// 2. BUSCA DE DADOS (QUERY AJUSTADA PARA IMAGEM)
async function getLandingData() {
  const query = `{
    "landing": *[_type == "landingPage"][0]{
      tituloHero,
      subtituloHero
    },
    "posts": *[_type == "post"] | order(_createdAt desc)[0...3]{
      _id,
      "tituloPost": title,
      "slug": slug.current,
      _createdAt,
      // AJUSTE PARA PEGAR A URL DA IMAGEM REAL
      "imagemUrl": mainImage.asset->url,
      "resumoPost": body[0].children[0].text
    }
  }`;
  
  // O 'no-store' reforça que o Next.js não deve salvar este resultado.
  return await client.fetch(query, {}, { 
    cache: 'no-store', 
    next: { revalidate: 0 } 
  });
}

export default async function HomePage() {
  const data = await getLandingData();
  
  // Variáveis da Landing Page com textos do Sanity
  const title = data?.landing?.tituloHero || "Gestão Ocupacional sem burocracia.";
  const subtitle = data?.landing?.subtituloHero || "O Novavix GO centraliza seus eventos de SST.";
  const posts = data?.posts || [];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 origin-top scale-90 lg:scale-100">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="relative w-[150px] h-[45px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#blog" className="hover:text-blue-600 transition-colors">Blog</a>
            <Link href="/login" className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-slate-200 ml-4">
              Acesso Restrito
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Zap size={14} /> Inteligência em SST & eSocial
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8 whitespace-pre-line">
              {title}
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[480px] mb-10">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="https://wa.me/5527992655561" className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                Solicitar Demonstração <ChevronRight size={18} />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-slate-900 rounded-[40px] aspect-video w-full overflow-hidden
