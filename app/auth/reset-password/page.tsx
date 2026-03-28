'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { validateStrongPassword } from '@/lib/auth/password-policy'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

type RecoveryState = 'idle' | 'token_error' | 'ready' | 'updating' | 'done' | 'error'

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(raw)
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<RecoveryState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const run = async () => {
      const params = parseHashParams(window.location.hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const errorCode = params.get('error_code')
      const errorDescription = params.get('error_description')

      if (errorCode) {
        setState('token_error')
        setMessage(
          errorCode === 'otp_expired'
            ? 'Link de recuperacao expirado. Gere um novo e-mail de redefinicao.'
            : decodeURIComponent(errorDescription ?? 'Link de recuperacao invalido.')
        )
        return
      }

      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setState('token_error')
            setMessage('Nao foi possivel validar o link de recuperacao. Solicite outro e-mail.')
            return
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setState('token_error')
          setMessage('Sessao de recuperacao nao encontrada. Solicite novo link de senha.')
          return
        }

        if (window.location.hash) {
          router.replace('/auth/reset-password')
        }

        setState('ready')
      } catch {
        setState('token_error')
        setMessage('Falha ao iniciar recuperacao de senha. Tente novamente.')
      }
    }

    void run()
  }, [router, supabase])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setState('error')
      setMessage('As senhas nao conferem.')
      return
    }

    const validation = validateStrongPassword(password)
    if (!validation.valid) {
      setState('error')
      setMessage(validation.errors[0] ?? 'Senha invalida.')
      return
    }

    setState('updating')
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setState('error')
      setMessage('Nao foi possivel atualizar a senha. Solicite novo link e tente novamente.')
      return
    }

    setState('done')
    setMessage('Senha atualizada com sucesso. Voce ja pode entrar com a nova senha.')
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <section className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[11px] uppercase tracking-widest font-black text-blue-700">Recuperacao de Senha</p>
        <h1 className="text-2xl font-black text-slate-900 mt-2">Definir Nova Senha</h1>

        {message ? (
          <p
            className={`mt-4 text-sm font-medium ${
              state === 'done' ? 'text-emerald-700' : state === 'ready' || state === 'updating' ? 'text-slate-600' : 'text-rose-700'
            }`}
          >
            {message}
          </p>
        ) : null}

        {state === 'token_error' ? (
          <div className="mt-6">
            <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold">
              Voltar para login
            </Link>
          </div>
        ) : null}

        {state === 'ready' || state === 'updating' || state === 'error' ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={state === 'updating'}
              className="w-full px-4 py-3 rounded-xl bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {state === 'updating' ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        ) : null}

        {state === 'done' ? (
          <div className="mt-6">
            <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">
              Ir para login
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  )
}
