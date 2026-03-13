'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
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
  <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
    <div className="w-full max-w-[400px] bg-white p-10 rounded-[32px] shadow-2xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal do Cliente</h2>
        <p className="text-slate-400">Entre com suas credenciais Novavix</p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-5">
        <input
          type="email"
          placeholder="E-mail cadastrado"
          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Sua senha"
          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-teal-100"
        >
          {loading ? 'Carregando...' : 'Acessar Documentos'}
        </button>
      </form>
    </div>
  </div>
);
