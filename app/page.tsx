import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight, LayoutDashboard, Rss } from 'lucide-react';
import { createClient } from 'next-sanity';

// FORÇA O NEXT.JS A BUSCAR DADOS NOVOS EM TODA VISITA
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. Configuração do Cliente Sanity
const client = createClient({
  projectId: '70qpcg23',
  dataset: 'production',
  apiVersion: '2024-03-19',
  useCdn: false, // Desativado para evitar cache de dados antigos
});

// 2. Busca Dinâmica Unificada (Nomes exatos do seu JSON)
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
      "imagemUrl": mainImage.asset->url,
      "resumoPost": body[0].children[0].text
    }
  }`;
  // O 'no-store' garante que o Next.js não salve esses dados em cache no servidor
  return await client.fetch(query, {}, { next: { revalidate: 0 }, cache: 'no-store' });
}

export default async function HomePage() {
  const data = await getLandingData();
  
  // Variáveis com Fallbacks (Plano B caso o Sanity falhe)
  const title = data?.landing?.tituloHero || "Segurança do Trabalho Digital e Eficiente";
  const subtitle = data?.landing?.subtituloHero || "O NOVAVIX GO é a solução simples e completa para sua Gestão SST.";

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

      {/* HERO
