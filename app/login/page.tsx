'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'empresa' | 'admin' | 'clinica'>('empresa')
  const [cnpj, setCnpj] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const router = useRouter()

  const azulNovavix = '#1E3A5F'

  const getRedirectPath = (fallback: string): string => {
    if (typeof window === 'undefined') return fallback

    const requestedPath = new URLSearchParams(window.location.search).get('next')
    if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
      return fallback
    }

    if (mode === 'clinica' && !requestedPath.startsWith('/clinic')) {
      return '/clinic'
    }

    if ((mode === 'empresa' || mode === 'admin') && requestedPath.startsWith('/clinic')) {
      return fallback
    }

    return requestedPath
  }

  const resetModeState = (nextMode: 'empresa' | 'admin' | 'clinica') => {
    setMode(nextMode)
    setError(null)
    setFeedback(null)
    setLoading(false)
    setResetLoading(false)
  }

  const getCurrentIdentifier = (): { email?: string; cnpj?: string } => {
    if (mode === 'empresa') {
      return { cnpj: cnpj.trim() }
    }

    return { email: (mode === 'admin' ? adminEmail : clinicEmail).trim().toLowerCase() }
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    if (password.trim().length === 0) {
      setError('Informe sua senha.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'empresa' && cnpj.trim().length === 0) {
        setError('Informe o CNPJ.')
        return
      }

      if (mode === 'admin' || mode === 'clinica') {
        const email = mode === 'admin' ? adminEmail.trim() : clinicEmail.trim()
        if (!email) {
          setError(mode === 'admin' ? 'Informe o e-mail de administrador.' : 'Informe o e-mail da clinica.')
          return
        }
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          password,
          ...getCurrentIdentifier(),
        }),
      })

      const loginJson = (await loginResponse.json().catch(() => null)) as
        | { ok: true; data: { redirectTo: string } }
        | { ok: false; error?: { message?: string } }
        | null

      if (!loginResponse.ok || !loginJson?.ok) {
        setError(!loginJson || loginJson.ok ? 'Credenciais invalidas.' : loginJson.error?.message ?? 'Credenciais invalidas.')
        return
      }

      router.push(getRedirectPath(loginJson.data.redirectTo))
      router.refresh()
    } catch (loginError) {
      console.error('[login] failed', loginError)
      setError('Nao foi possivel iniciar a sessao. Confira a configuracao do Supabase na hospedagem.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setError(null)
    setFeedback(null)

    const identifier = getCurrentIdentifier()
    if (mode === 'empresa' && !identifier.cnpj) {
      setError('Informe o CNPJ para solicitar recuperacao de senha.')
      return
    }
    if (mode !== 'empresa' && !identifier.email) {
      setError('Informe o e-mail para solicitar recuperacao de senha.')
      return
    }

    setResetLoading(true)
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          ...identifier,
        }),
      })
      const json = (await response.json().catch(() => null)) as { data?: { message?: string } } | null
      setFeedback(json?.data?.message ?? 'Se os dados estiverem cadastrados, enviaremos um link de redefinicao de senha.')
    } catch {
      setFeedback('Se os dados estiverem cadastrados, enviaremos um link de redefinicao de senha.')
    } finally {
      setResetLoading(false)
    }
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
          </div>

          <div className="mb-4 grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => resetModeState('empresa')}
              disabled={loading}
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'empresa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Empresa
            </button>
            <button
              type="button"
              onClick={() => resetModeState('admin')}
              disabled={loading}
              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => resetModeState('clinica')}
              disabled={loading}
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
            {feedback ? (
              <div className="bg-emerald-50 text-emerald-700 text-[11px] font-bold p-3 rounded-lg text-center border border-emerald-100">
                {feedback}
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
                  autoComplete="organization"
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
                  autoComplete="email"
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
                  autoComplete="email"
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: azulNovavix }}
            >
              {loading ? 'Validando...' : 'Entrar no Sistema'}
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={loading || resetLoading}
              className="w-full text-blue-700 py-2 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {resetLoading ? 'Enviando link...' : 'Esqueci minha senha'}
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
