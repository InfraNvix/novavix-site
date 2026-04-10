'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { FormFieldSchema, FormTemplateSchema } from '@/lib/forms/parser'

type TemplateResponse = {
  id: string
  templateName: string
  schema: FormTemplateSchema
}

type Collaborator = {
  id: string
  externalEmployeeId: string | null
  fullName: string | null
}

type LoadState = 'loading' | 'ready' | 'error'
type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

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
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [collaboratorId, setCollaboratorId] = useState('')
  const [collaboratorLoading, setCollaboratorLoading] = useState(false)
  const [collaboratorMessage, setCollaboratorMessage] = useState<string | null>(null)
  const [cnpj, setCnpj] = useState('')
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({})

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`/api/forms/${templateId}`)
        const json = await response.json()
        if (!response.ok || !json.ok) {
          throw new Error(json?.error?.message ?? 'Falha ao carregar formulario.')
        }

        const data = json.data as TemplateResponse
        setTemplate(data)
        const initialAnswers: Record<string, string | boolean> = {}
        for (const field of data.schema.fields) {
          if (field.type !== 'section') {
            initialAnswers[field.key] = field.type === 'boolean' ? false : ''
          }
        }
        setAnswers(initialAnswers)
        setLoadState('ready')
      } catch (err) {
        setLoadState('error')
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulario.')
      }
    }
    void run()
  }, [templateId])

  useEffect(() => {
    setCollaborators([])
    setCollaboratorId('')
    setCollaboratorMessage(null)
  }, [cnpj])

  async function handleLoadCollaborators(): Promise<void> {
    setCollaboratorLoading(true)
    setCollaboratorMessage(null)
    setError(null)
    try {
      if (!cnpj) {
        throw new Error('Informe o CNPJ para carregar os colaboradores.')
      }
      const response = await fetch(`/api/forms/collaborators?cnpj=${encodeURIComponent(cnpj)}`)
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json?.error?.message ?? 'Falha ao carregar colaboradores.')
      }

      const list = (json.data?.collaborators ?? []) as Collaborator[]
      setCollaborators(list)
      setCollaboratorId('')
      if (list.length === 0) {
        setCollaboratorMessage('Nenhum colaborador ativo encontrado para este CNPJ.')
      }
    } catch (err) {
      setCollaborators([])
      setCollaboratorId('')
      setCollaboratorMessage(null)
      setError(err instanceof Error ? err.message : 'Falha ao carregar colaboradores.')
    } finally {
      setCollaboratorLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!template) return
    setSubmitState('submitting')
    setError(null)

    try {
      if (!cnpj) {
        throw new Error('Informe o CNPJ antes de enviar.')
      }
      if (!collaboratorId) {
        throw new Error('Selecione o colaborador.')
      }

      const response = await fetch(`/api/forms/${template.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj,
          collaboratorId,
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
        <p className="text-sm text-slate-600 mt-2">Preencha o CNPJ e selecione o colaborador.</p>

        {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        {submitState === 'success' ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="checkmark" viewBox="0 0 52 52" aria-hidden="true">
                  <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                  <path className="checkmark-check" fill="none" d="M14 27 l7 7 l17 -17" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold">Enviado</p>
                <p className="text-xs text-emerald-700/80">Respostas registradas com sucesso.</p>
              </div>
            </div>
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">CNPJ</label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={cnpj}
                  onChange={(event) => setCnpj(event.target.value)}
                  placeholder="Digite o CNPJ da empresa"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={handleLoadCollaborators}
                  disabled={collaboratorLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60"
                >
                  {collaboratorLoading ? 'Buscando...' : 'Buscar colaboradores'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2 block">
                Colaborador
              </label>
              <select
                value={collaboratorId}
                onChange={(event) => setCollaboratorId(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                required
              >
                <option value="">Selecione o colaborador</option>
                {collaborators.map((collaborator) => (
                  <option key={collaborator.id} value={collaborator.id}>
                    {collaborator.fullName ?? 'Sem nome'}
                    {collaborator.externalEmployeeId ? ` - ${collaborator.externalEmployeeId}` : ''}
                  </option>
                ))}
              </select>
              {collaboratorMessage ? <p className="text-xs text-slate-500 mt-2">{collaboratorMessage}</p> : null}
            </div>
          </div>

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

          {template.schema.fields.map((field) => {
            if (field.type === 'section') {
              return (
                <div key={field.key} className="pt-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">{field.label}</p>
                </div>
              )
            }

            return (
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
            )
          })}

          <button
            type="submit"
            disabled={submitState === 'submitting' || submitState === 'success'}
            className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
          >
            {submitState === 'submitting' ? 'Enviando...' : submitState === 'success' ? 'Enviado' : 'Enviar respostas'}
          </button>
        </form>
      </section>
      <style jsx>{`
        .checkmark {
          width: 28px;
          height: 28px;
          stroke: #16a34a;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .checkmark-circle {
          stroke: #16a34a;
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: draw-circle 420ms ease-out forwards;
        }
        .checkmark-check {
          stroke: #16a34a;
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: draw-check 420ms 180ms ease-out forwards;
        }
        @keyframes draw-circle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </main>
  )
}
