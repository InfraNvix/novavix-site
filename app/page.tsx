import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Zap, BarChart3, ChevronRight, LayoutDashboard } from 'lucide-react';
import { createClient } from 'next-sanity';

const client = createClient({
  projectId: '70qpcg23',
  dataset: 'production',
  apiVersion: '2024-03-19',
  useCdn: false,
});

export default async function HomePage() {
  // Busca direta e segura
  const data = await client.fetch(`*[_type == "landingPage"][0]{tituloPrincipal, subtitulo}`);

  const title = data?.tituloPrincipal || "Gestão Ocupacional sem burocracia.";
  const subtitle = data?.subtitulo || "O Novavix GO centraliza seus eventos de SST, PGR e PCMSO.";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 origin-top scale-90 lg:scale-100">
      
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="relative w-[150px] h-[45px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain object-left" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Link href="/login" className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-slate-200">
              Acesso Restrito
            </Link>
          </div>
        </div>
      </nav>

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
            <div className="bg-slate-900 rounded-[40px] aspect-video w-full overflow-hidden shadow-2xl border-[8px] border-white relative flex flex-col items-center justify-center p-12">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 border border-blue-500/30">
                  <LayoutDashboard size={32} />
                </div>
                <p className="text-white/60 font-black uppercase tracking-[0.4em] text-[10px]">Novavix GO</p>
                <p className="text-white/20 font-medium text-[11px] italic mt-4">Interface de Gestão</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 Novavix Sistemas</p>
        </div>
      </footer>
    </div>
  );
}
