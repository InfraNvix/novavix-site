'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const router = useRouter()

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault()
setLoading(true)
setError(null)

const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) {
  setError(error.message as any)
  setLoading(false)
} else {
  router.push('/portal') 
}
}

return (
<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
<div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-xl border border-slate-100">
<div className="text-center mb-10">
<h1 className="font-black text-2xl text-slate-800 italic mb-2">NOVAVIX</h1>
<p className="text-slate-500 font-medium">Acesse o seu portal de documentos</p>
</div>

    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail</label>
        <input 
          type="email" 
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          placeholder="exemplo@empresa.com"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Senha</label>
        <input 
          type="password" 
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-xl">{error}</p>}

      
    <button 
      type="submit" 
      disabled={loading}
      className="w-full bg-[#1E3A5F] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all active:scale-[0.98]"
      >
      {loading ? 'Entrando...' : 'Entrar no Portal'}
    </button>>
    </form>
  </div>
</div>
)
}
