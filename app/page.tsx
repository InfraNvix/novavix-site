import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const azulNovavix = "#1E3A5F";

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* HEADER COM A LOGO */}
      <nav className="p-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="relative w-[220px] h-[60px]">
            <Image 
              src="/logo-novavix.png.png" // Usei o nome que vi no seu Git para garantir que apareça
              alt="Novavix" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <Link 
            href="/login" 
            className="text-white px-8 py-3 rounded-xl font-bold text-sm" 
            style={{ backgroundColor: azulNovavix }}
          >
            Portal do Cliente
          </Link>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <header className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl lg:text-7xl font-black mb-8" style={{ color: azulNovavix }}>
          Segurança do Trabalho Digital
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed">
          Sua empresa em conformidade com as NRs e o eSocial em uma plataforma moderna e ágil.
        </p>
        <Link 
          href="https://wa.me/5527999999999" 
          className="text-white px-12 py-5 rounded-2xl font-bold text-lg shadow-2xl"
          style={{ backgroundColor: azulNovavix }}
        >
          Solicitar Consultoria
        </Link>
      </header>

      <footer className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
        © 2026 NOVAVIX - Gestão Ocupacional
      </footer>
    </div>
  );
}
