'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { FormFieldSchema, FormTemplateSchema } from '@/lib/forms/parser'

type TemplateResponse = {
  id: string
  companyId: string
  companyCnpj: string
  templateName: string
  schema: FormTemplateSchema
}

type LoadState = 'loading' | 'ready' | 'error'
type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

function getCnpjFromLocation(): string {
  if (typeof window === 'undefined') return ''
  return (new URLSearchParams(window.location.search).get('cnpj') ?? '').trim()
}

function toInputType(field: FormFieldSchema): string {
  if (field.type === 'number') return 'number'
  if (field.type === 'date') return 'date'
  return 'text'
}

export default function DynamicFormClient({ templateId }: { templateId: string }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [template, setTemplate] = useState<TemplateResponse | null>(null)
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({})

  const cnpj = useMemo(() => getCnpjFromLocation(), [])

  useEffect(() => {
    const run = async () => {
      if (!cnpj) {
        setLoadState('error')
        setError('CNPJ nao informado na URL. Use ?cnpj=XXXXXXXXXXXXXX')
        return
      }

      try {
        const response = await fetch(`/api/forms/${templateId}?cnpj=${encodeURIComponent(cnpj)}`)
        const json = await response.json()
        if (!response.ok || !json.ok) {
          throw new Error(json?.error?.message ?? 'Falha ao carregar formulario.')
        }

        const data = json.data as TemplateResponse
        setTemplate(data)
        const initialAnswers: Record<string, string | boolean> = {}
        for (const field of data.schema.fields) {
          initialAnswers[field.key] = field.type === 'boolean' ? false : ''
        }
        setAnswers(initialAnswers)
        setLoadState('ready')
      } catch (err) {
        setLoadState('error')
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulario.')
      }
    }
    void run()
  }, [cnpj, templateId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!template) return
    setSubmitState('submitting')
    setError(null)

    try {
      const response = await fetch(`/api/forms/${template.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj,
          respondentName,
          respondentEmail,
          answers,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        const details = Array.isArray(json?.error?.details) ? json.error.details.join(' | ') : null
        throw new Error(details || json?.error?.message || 'Falha ao enviar formulario.')
      }

      setSubmitState('success')
    } catch (err) {
      setSubmitState('error')
      setError(err instanceof Error ? err.message : 'Falha ao enviar formulario.')
    }
  }

  if (loadState === 'loading') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Carregando formulario...</p>
      </main>
    )
  }

  if (loadState === 'error' || !template) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-3xl mx-auto bg-white border border-rose-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">Formulario indisponivel</h1>
          <p className="text-sm text-rose-700 mt-3">{error ?? 'Falha ao carregar formulario.'}</p>
          <Link href="/" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para inicio
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest font-black text-blue-700">Formulario Dinamico</p>
        <h1 className="text-2xl font-black text-slate-900 mt-2">{template.schema.title || template.templateName}</h1>
        <p className="text-sm text-slate-600 mt-2">Empresa CNPJ: {template.companyCnpj}</p>

        {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        {submitState === 'success' ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Respostas enviadas com sucesso. Obrigado.
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            value={respondentName}
            onChange={(event) => setRespondentName(event.target.value)}
            placeholder="Seu nome (opcional)"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
          />
          <input
            type="email"
            value={respondentEmail}
            onChange={(event) => setRespondentEmail(event.target.value)}
            placeholder="Seu e-mail (opcional)"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
          />

          {template.schema.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">
                {field.label}
                {field.required ? ' *' : ''}
              </label>

              {field.type === 'select' ? (
                <select
                  value={String(answers[field.key] ?? '')}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  required={field.required}
                >
                  <option value="">Selecione</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(answers[field.key])}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [field.key]: event.target.checked }))}
                  />
                  Sim
                </label>
              ) : (
                <input
                  type={toInputType(field)}
                  value={String(answers[field.key] ?? '')}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  required={field.required}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitState === 'submitting' || submitState === 'success'}
            className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
          >
            {submitState === 'submitting' ? 'Enviando...' : submitState === 'success' ? 'Enviado' : 'Enviar respostas'}
          </button>
        </form>
      </section>
    </main>
  )
}

