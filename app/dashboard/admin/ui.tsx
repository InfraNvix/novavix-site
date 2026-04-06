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
  companyId: string
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
  const [companyId, setCompanyId] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      setTemplates((templatesJson.data?.templates ?? []) as Template[])

      if (!companyId && nextCompanies[0]?.id) {
        setCompanyId(nextCompanies[0].id)
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

    if (!companyId) {
      setError('Selecione uma empresa para upload.')
      return
    }
    if (!file) {
      setError('Selecione o arquivo do formulario.')
      return
    }

    const formData = new FormData()
    formData.set('companyId', companyId)
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
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                required
              >
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nomeFantasia ?? company.razaoSocial} - {company.cnpj}
                  </option>
                ))}
              </select>
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
              <p className="text-xs text-slate-500">Formatos suportados: JSON, CSV e XLSX (max 5MB).</p>
              <button type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold">
                Enviar template
              </button>
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
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => {
                    const company = companiesById.get(template.companyId)
                    return (
                      <tr key={template.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-900">{template.templateName}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {company?.nomeFantasia ?? company?.razaoSocial ?? template.companyId}
                        </td>
                        <td className="px-3 py-3 text-slate-700 uppercase">{template.sourceFormat}</td>
                        <td className="px-3 py-3 text-slate-700">{template.sourceFileName}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {company ? (
                            <code className="text-xs break-all">
                              {`/formularios/${template.id}?cnpj=${company.cnpj}`}
                            </code>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
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
