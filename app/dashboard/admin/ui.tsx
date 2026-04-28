'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Company = {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  status: string
  createdAt: string
}

type Template = {
  id: string
  companyId: string | null
  templateName: string
  sourceFormat: string
  sourceFileName: string
  status: string
  createdAt: string
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminSetupClient() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteTemplateId, setInviteTemplateId] = useState('')
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState('7')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function loadData(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const [companiesRes, templatesRes] = await Promise.all([fetch('/api/admin/companies'), fetch('/api/admin/forms')])
      const companiesJson = await companiesRes.json()
      const templatesJson = await templatesRes.json()

      if (!companiesRes.ok || !companiesJson.ok) {
        throw new Error('Nao foi possivel carregar empresas.')
      }
      if (!templatesRes.ok || !templatesJson.ok) {
        throw new Error('Nao foi possivel carregar templates.')
      }

      const nextCompanies = (companiesJson.data?.companies ?? []) as Company[]
      setCompanies(nextCompanies)
      const nextTemplates = (templatesJson.data?.templates ?? []) as Template[]
      setTemplates(nextTemplates)
      if (!inviteTemplateId) {
        const firstActiveTemplate = nextTemplates.find((template) => template.status === 'active')
        if (firstActiveTemplate?.id) {
          setInviteTemplateId(firstActiveTemplate.id)
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados do painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const companiesById = useMemo(() => {
    const map = new Map<string, Company>()
    for (const company of companies) {
      map.set(company.id, company)
    }
    return map
  }, [companies])

  async function handleCreateCompany(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj,
          razaoSocial,
          nomeFantasia,
          loginEmail,
          password,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        const details = Array.isArray(json?.error?.details) ? json.error.details.join(' | ') : null
        throw new Error(details || json?.error?.message || 'Falha ao cadastrar empresa.')
      }

      setSuccess(`Empresa cadastrada com sucesso. Login: ${json.data.credentials.loginEmail}`)
      setCnpj('')
      setRazaoSocial('')
      setNomeFantasia('')
      setLoginEmail('')
      setPassword('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar empresa.')
    }
  }

  async function handleUploadTemplate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!file) {
      setError('Selecione o arquivo do formulario.')
      return
    }

    const formData = new FormData()
    formData.set('templateName', templateName)
    formData.set('file', file)

    try {
      const response = await fetch('/api/admin/forms/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        const details = Array.isArray(json?.error?.details) ? json.error.details.join(' | ') : null
        throw new Error(details || json?.error?.message || 'Falha ao subir formulario.')
      }

      setSuccess(`Template "${json.data.templateName}" enviado com sucesso.`)
      setTemplateName('')
      setFile(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao subir formulario.')
    }
  }

  async function handleDeleteTemplate(template: Template): Promise<void> {
    const confirmed = window.confirm(`Excluir o template "${template.templateName}"? Essa acao nao pode ser desfeita.`)
    if (!confirmed) return

    setDeletingId(template.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/forms?templateId=${encodeURIComponent(template.id)}`, {
        method: 'DELETE',
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        const details = Array.isArray(json?.error?.details) ? json.error.details.join(' | ') : null
        throw new Error(details || json?.error?.message || 'Falha ao excluir template.')
      }
      setSuccess('Template excluido com sucesso.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir template.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSendEmailInvite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setInviteFeedback(null)
    setError(null)
    setSuccess(null)
    setInviteSending(true)

    try {
      const response = await fetch('/api/admin/form-email-invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: inviteEmail,
          templateId: inviteTemplateId,
          expiresInDays: Number(inviteExpiresInDays || '7'),
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        const details = Array.isArray(json?.error?.details) ? json.error.details.join(' | ') : null
        throw new Error(details || json?.error?.message || 'Falha ao enviar convite.')
      }

      setInviteFeedback({
        type: 'success',
        message: `Convite enviado para ${json.data.recipientEmail}.`,
      })
      setInviteEmail('')
      setInviteExpiresInDays('7')
    } catch (err) {
      setInviteFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao enviar convite.',
      })
    } finally {
      setInviteSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest font-black text-blue-700">Painel Admin - Etapa 1</p>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Cadastro de Empresas e Upload de Formularios</h1>
          <p className="text-sm text-slate-600 mt-2">
            Aqui voce cadastra CNPJ + senha e envia arquivos base para o gerador de formularios.
          </p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para dashboard
          </Link>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">{error}</div> : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm">{success}</div> : null}

        <section className="grid lg:grid-cols-2 gap-6">
          <article className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-slate-900">1. Cadastrar Empresa</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreateCompany}>
              <input
                value={cnpj}
                onChange={(event) => setCnpj(event.target.value)}
                placeholder="CNPJ (somente numeros ou com mascara)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <input
                value={razaoSocial}
                onChange={(event) => setRazaoSocial(event.target.value)}
                placeholder="Razao social"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <input
                value={nomeFantasia}
                onChange={(event) => setNomeFantasia(event.target.value)}
                placeholder="Nome fantasia (opcional)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="E-mail de login (opcional)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha forte"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <button type="submit" className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold">
                Cadastrar empresa
              </button>
            </form>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-slate-900">2. Subir Arquivo de Formulario</h2>
            <form className="mt-4 space-y-3" onSubmit={handleUploadTemplate}>
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Nome do template (ex.: Formulario Admissional)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <input
                type="file"
                accept=".json,.csv,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <p className="text-xs text-slate-500">
                Template global: sera usado por qualquer empresa. Formatos suportados: JSON, CSV e XLSX (max 5MB).
              </p>
              <button type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold">
                Enviar template
              </button>
            </form>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-slate-900">3. Enviar formulario por e-mail</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSendEmailInvite}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="E-mail de destino"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              />
              <select
                value={inviteTemplateId}
                onChange={(event) => setInviteTemplateId(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              >
                <option value="">Selecione o template</option>
                {templates
                  .filter((template) => template.status === 'active')
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.templateName}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={1}
                max={30}
                value={inviteExpiresInDays}
                onChange={(event) => setInviteExpiresInDays(event.target.value)}
                placeholder="Validade em dias (padrao: 7)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
              <button
                type="submit"
                disabled={inviteSending}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {inviteSending ? 'Enviando...' : 'Enviar convite'}
              </button>
              {inviteFeedback ? (
                <p
                  className={`text-sm ${inviteFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  {inviteFeedback.message}
                </p>
              ) : null}
            </form>
          </article>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-lg font-black text-slate-900">Empresas Cadastradas</h2>
          {loading ? (
            <p className="text-sm text-slate-500 mt-3">Carregando...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-slate-500 uppercase text-[10px] tracking-widest">
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-3 py-2">Empresa</th>
                    <th className="text-left px-3 py-2">CNPJ</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Criada em</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-900">{company.nomeFantasia ?? company.razaoSocial}</td>
                      <td className="px-3 py-3 text-slate-700">{company.cnpj}</td>
                      <td className="px-3 py-3 text-slate-700">{company.status}</td>
                      <td className="px-3 py-3 text-slate-700">{formatDate(company.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-lg font-black text-slate-900">Templates Enviados</h2>
          {loading ? (
            <p className="text-sm text-slate-500 mt-3">Carregando...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Nenhum template enviado ainda.</p>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-slate-500 uppercase text-[10px] tracking-widest">
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-3 py-2">Template</th>
                    <th className="text-left px-3 py-2">Empresa</th>
                    <th className="text-left px-3 py-2">Formato</th>
                    <th className="text-left px-3 py-2">Arquivo</th>
                    <th className="text-left px-3 py-2">Link Publico</th>
                    <th className="text-left px-3 py-2">HTML</th>
                    <th className="text-left px-3 py-2">Excluir</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => {
                    const company = template.companyId ? companiesById.get(template.companyId) : undefined
                    return (
                      <tr key={template.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-900">{template.templateName}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {company?.nomeFantasia ?? company?.razaoSocial ?? (template.companyId ? template.companyId : 'Global')}
                        </td>
                        <td className="px-3 py-3 text-slate-700 uppercase">{template.sourceFormat}</td>
                        <td className="px-3 py-3 text-slate-700">{template.sourceFileName}</td>
                        <td className="px-3 py-3 text-slate-700">
                          <code className="text-xs break-all">{`/formularios/${template.id}`}</code>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <Link href={`/api/forms/${template.id}/html`} className="text-xs font-bold text-blue-700">
                            Ver HTML
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template)}
                            disabled={deletingId === template.id}
                            className="text-xs font-bold text-rose-600 disabled:opacity-60"
                          >
                            {deletingId === template.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{template.status}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDate(template.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
