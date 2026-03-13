'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="font-black text-2xl text-slate-800 tracking-tighter">NOVAVIX</div>
        <Link 
          href="/login" 
          className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#0d9488] transition-all shadow-md shadow-teal-100"
        >
          Portal do Cliente
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-black text-slate-900 mb-8 tracking-tight">
          Gestão Inteligente de <span className="text-[#14b8a6]">SST</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Segurança do Trabalho levada a sério com tecnologia de ponta. 
          Acesse, baixe e gerencie seus documentos técnicos com agilidade.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">
            Conhecer Soluções
          </button>
          <button className="border-2 border-slate-200 text-slate-600 px-10 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            Falar com Especialista
          </button>
        </div>
      </main>
    </div>
  );
}
