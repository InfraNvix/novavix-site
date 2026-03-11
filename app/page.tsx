import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Menu Superior */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black text-blue-900 tracking-tighter">
            NOVAVIX<span className="text-teal-500">.</span>
          </div>
          <div className="flex gap-4">
            <a href="/portal" className="bg-blue-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-800 transition shadow-lg shadow-blue-200">
              Área do Cliente
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="max-w-3xl">
          <span className="text-teal-600 font-bold tracking-widest uppercase text-sm">Tecnologia em SST</span>
          <h1 className="text-5xl lg:text-7xl font-black text-blue-900 mt-4 leading-[1.1]">
            Gestão de Saúde <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-teal-500">
              Inteligente e Segura.
            </span>
          </h1>
          <p className="text-xl text-slate-500 mt-8 leading-relaxed max-w-2xl">
            Sincronização em tempo real com o Novavix GO. Acesse seus documentos, ASOs e PGRs de forma instantânea e 100% digital.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <button className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition">
              Conhecer Soluções
            </button>
            <div className="flex items-center gap-3 px-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-medium text-slate-600">Portal de Documentos Ativo</span>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé Simples */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          © 2026 Novavix Sistemas - Inteligência em Segurança do Trabalho.
        </div>
      </footer>
    </div>
  );
}
