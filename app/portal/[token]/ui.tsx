'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DynamicFormClient from '@/app/formularios/[templateId]/ui'

type LoadState = 'loading' | 'ready' | 'error'

function hideInviteTokenFromUrl(): void {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', '/portal')
}

export default function PortalInviteClient({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>('loading')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('Validando convite.')

  useEffect(() => {
    const run = async () => {
      try {
        const trimmedToken = token.trim()
        if (!trimmedToken) {
          throw new Error('Token de convite obrigatorio.')
        }

        hideInviteTokenFromUrl()
        const response = await fetch('/api/forms/invites/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite: trimmedToken }),
        })
        const json = await response.json()
        if (!response.ok || !json.ok) {
          throw new Error(json?.error?.message ?? 'Convite invalido.')
        }

        const nextTemplateId = typeof json.data?.templateId === 'string' ? json.data.templateId : ''
        if (!nextTemplateId) {
          throw new Error('Template do convite nao encontrado.')
        }

        setTemplateId(nextTemplateId)
        setState('ready')
        hideInviteTokenFromUrl()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Convite invalido.')
        setState('error')
      }
    }

    void run()
  }, [token])

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Validando convite...</p>
      </main>
    )
  }

  if (state === 'error' || !templateId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-3xl mx-auto bg-white border border-rose-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">Convite indisponivel</h1>
          <p className="text-sm text-rose-700 mt-3">{message}</p>
          <Link href="/" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para inicio
          </Link>
        </section>
      </main>
    )
  }

  return <DynamicFormClient templateId={templateId} initialInviteToken={token} />
}
