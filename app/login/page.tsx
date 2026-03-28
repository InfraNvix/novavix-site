'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { normalizeCnpj } from '@/lib/auth/cnpj'
import { DEMO_MODE_ENABLED } from '@/lib/auth/demo'
import { validateStrongPassword } from '@/lib/auth/password-policy'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const [mode, setMode] = useState<'empresa' | 'admin' | 'clinica'>('empresa')
  const [cnpj, setCnpj] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => {
    if (DEMO_MODE_ENABLED) {
      return null
    }
    return getSupabaseBrowserClient()
  }, [])

  const azulNovavix = '#1E3A5F'

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const passwordValidation = validateStrongPassword(password)

    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0] ?? 'Senha fora da politica minima.')
      setLoading(false)
      return
    }

    if (DEMO_MODE_ENABLED) {
      if (mode === 'admin') {
        const response = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'admin',
            email: adminEmail,
            password,
          }),
        })

        if (!response.ok) {
          setError('Credenciais demo invalidas.')
          setLoading(false)
          return
        }

        router.push('/admin')
        router.refresh()
        return
      }

      if (mode === 'clinica') {
        const response = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'clinica',
            email: clinicEmail,
            password,
          }),
        })

        if (!response.ok) {
          setError('Credenciais demo invalidas.')
          setLoading(false)
          return
        }

        router.push('/clinic')
        router.refresh()
        return
      }

      const normalizedCnpj = normalizeCnpj(cnpj)
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'empresa',
          cnpj: normalizedCnpj,
          password,
        }),
      })

      if (!response.ok) {
        setError('Credenciais demo invalidas.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
      return
    }

    if (!supabase) {
      setError('Cliente de autenticacao indisponivel.')
      setLoading(false)
      return
    }

    if (mode === 'admin') {
      if (!adminEmail) {
        setError('Informe o e-mail de administrador.')
        setLoading(false)
        return
      }

      const { error: adminSignInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password,
      })

      if (adminSignInError) {
        setError('Credenciais invalidas.')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
      return
    }

    if (mode === 'clinica') {
      if (!clinicEmail) {
        setError('Informe o e-mail da clinica.')
        setLoading(false)
        return
      }

      const { error: clinicSignInError } = await supabase.auth.signInWithPassword({
        email: clinicEmail,
        password,
      })

      if (clinicSignInError) {
        setError('Credenciais invalidas.')
        setLoading(false)
        return
      }

      router.push('/clinic')
      router.refresh()
      return
    }

    const normalizedCnpj = normalizeCnpj(cnpj)
    if (normalizedCnpj.length !== 14) {
      setError('Informe um CNPJ valido com 14 digitos.')
      setLoading(false)
      return
    }

    const lookupResponse = await fetch('/api/auth/company-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnpj: normalizedCnpj,
        password,
      }),
    })

    const lookupJson = (await lookupResponse.json()) as
      | { ok: true; data: { email: string } }
      | { ok: false; error?: { message?: string } }

    if (!lookupResponse.ok || !lookupJson.ok) {
      setError(lookupJson.ok ? 'Credenciais invalidas.' : lookupJson.error?.message ?? 'Credenciais invalidas.')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lookupJson.data.email,
      password,
    })

    if (signInError) {
      setError('Credenciais invalidas.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-center items-center p-6 origin-top scale-90 lg:scale-100">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          Voltar para inicio
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <div className="relative w-[180px] h-[50px]">
            <Image src="/logo-novavix.png" alt="Novavix" fill className="object-contain" priority />
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-200 border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal NOVAVIX GO</h1>
            <p className="text-[13px] text-slate-500 mt-2 font-medium">Gestao Tecnica Ocupacional</p>
            {DEMO_MODE_ENABLED ? (
              <p className="text-[11px] text-amber-600 mt-2 font-bold">Ambiente Demo Ativo</p>
            ) : null}
          </div>

          <div className="mb-4 grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('empresa')
                setError(null)
              }}
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'empresa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Empresa
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('admin')
                setError(null)
              }}
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('clinica')
                setError(null)
              }}
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'clinica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Clinica
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error ? (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-lg text-center border border-red-100">
                {error}
              </div>
            ) : null}

            {mode === 'empresa' ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  required
                  value={cnpj}
                  onChange={(event) => setCnpj(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="00.000.000/0000-00"
                />
              </div>
            ) : mode === 'admin' ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">
                  E-mail Admin
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="admin@novavix.com.br"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">
                  E-mail Clinica
                </label>
                <input
                  type="email"
                  required
                  value={clinicEmail}
                  onChange={(event) => setClinicEmail(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="clinica@novavix.com.br"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                placeholder="********"
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
            <p className="text-[11px] text-slate-400 font-medium">
              Duvidas com seu acesso?
              <br />
              <Link href="https://wa.me/5527992655561" className="text-blue-600 font-bold hover:underline">
                Fale com o suporte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
