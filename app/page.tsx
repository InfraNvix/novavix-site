'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navegação Simples */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="font-bold text-2xl text-slate-800">NOVAVIX</div>
        <Link 
          href="/login" 
          className="bg-teal-600 text-white px-6 py-2 rounded-full font-medium hover:bg-teal-700 transition"
        >
          Portal do Cliente
        </Link>
      </nav>

      {/* Conteúdo de Divulgação */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-6">
          Gestão Inteligente de SST
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          Segurança do trabalho com tecnologia e agilidade. 
          Acesse seus laudos e documentos técnicos em um só lugar.
        </p>
        <div className="flex justify-center gap-4">
          <button className="border border-slate-300 px-8 py-3 rounded-xl hover:bg-slate-50">
            Nossos Serviços
          </button>
        </div>
      </main>
    </div>
  );
}
