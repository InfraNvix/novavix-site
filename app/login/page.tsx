'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Erro ao acessar: ' + error.message);
    } else {
      router.push('/portal');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Portal do Cliente</h2>
        <p className="text-slate-500 text-center mb-8">Entre com suas credenciais Novavix</p>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail cadastrado"
            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Sua senha"
            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            className="w-full bg-teal-600 text-white p-4 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-200"
          >
            {loading ? 'Verificando...' : 'Acessar Documentos'}
          </button>
        </div>
      </form>
    </div>
  );
}
