import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const azulNovavix = "#1E3A5F";
  const azulClaro = "#3B82F6";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-center items-center p-6">
      {/* BOTÃO VOLTAR */}
      <div className="absolute top-8 left-8">
        <Link href="/" className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all">
          ← Voltar ao Início
        </Link>
      </div>

      <div className="w-full max-w-[400px]">
        {/* LOGO NO LOGIN */}
        <div className="flex justify-center mb-8">
          <div className="relative w-[180px] h-[50px]">
            <Image 
              src="/logo-novavix.png" 
              alt="Novavix" 
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* CARD DE LOGIN - ESCALA COMPACTA (85%) */}
        <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-200 border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal do Cliente</h1>
            <p className="text-[13px] text-slate-500 mt-2 font-medium">Acesse o sistema NOVAVIX GO</p>
          </div>

          <form className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">E-mail</label>
              <input 
                type="email" 
                placeholder="exemplo@empresa.com.br"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex justify-end">
              <Link href="#" className="text-[11px] font-bold text-blue-600 hover:underline">Esqueceu a senha?</Link>
            </div>

            <button 
              type="submit"
              className="w-full text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
              style={{ backgroundColor: azulNovavix }}
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[12px] text-slate-400">
              Ainda não é cliente? <br />
              <Link href="https://wa.me/5527992655561" className="text-blue-600 font-bold hover:underline">Solicite seu acesso aqui</Link>
            </p>
          </div>
        </div>

        {/* RODAPÉ DO LOGIN */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            © 2026 NOVAVIX GO · v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
