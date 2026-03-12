import { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Verifique se o caminho do seu cliente supabase está correto
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Erro ao fazer login: ' + error.message);
    } else {
      router.push('/portal'); // Redireciona para o portal após sucesso
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Acesso ao Portal Novavix</h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Sua senha"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            className="w-full bg-teal-600 text-white p-3 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
