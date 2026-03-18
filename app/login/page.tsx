'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

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
      setError("Credenciais inválidas. Tente novamente.");
      setLoading(false);
    } else {
      router.push('/dashboard'); // Redireciona após o login
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-center items-center p-6 scale-90 lg:scale-100">
      <div className="absolute top-8 left-8">
        <Link href="/" className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all">
          ← Voltar ao Início
        </Link>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <div className="relative w-[180px] h-[50px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain" priority />
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-200 border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal do Cliente</h1>
            <p className="text-[13px] text-slate-500 mt-2 font-medium">Acesse o sistema NOVAVIX GO</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-lg text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@empresa.com.br"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
              style={{ backgroundColor: azulNovavix }}
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[12px] text-slate-400">
              Ainda não é cliente? <br />
              <Link href="https://wa.me/5527992655561" className="text-blue-600 font-bold hover:underline">Solicite seu acesso aqui</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          © 2026 NOVAVIX GO · v1.0
        </div>
      </div>
    </div>
  );
}
