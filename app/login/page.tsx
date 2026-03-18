'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  // Inicialização correta usando @supabase/ssr
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const azulNovavix = "#1E3A5F";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Acesso negado. Verifique seu e-mail e senha.");
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-center items-center p-6">
      <div className="absolute top-8 left-8">
        <Link href="/" className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all">
          ← Início
        </Link>
      </div>

      <div className="w-full max-w-[380px] scale-90 lg:scale-100">
        <div className="flex justify-center mb-8">
          <div className="relative w-[180px] h-[50px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain" priority />
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-200 border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal NOVAVIX GO</h1>
            <p className="text-[13px] text-slate-500 mt-2 font-medium">Gestão Técnica Ocupacional</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-lg text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: azulNovavix }}
            >
              {loading ? 'Validando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Acesso exclusivo para clientes ativos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
