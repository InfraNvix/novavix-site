'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEMO_COMPANIES, DEMO_MODE_ENABLED } from '@/lib/auth/demo'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

type PreviewData = {
  importJobId: string
  detectedColumns: string[]
  previewRows: Record<string, string | number | null>[]
  validationSummary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateInFile: number
    duplicateInDatabase: number
  }
}

function detectFormat(fileName: string): 'csv' | 'txt' | 'xlsx' | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.txt')) return 'txt'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  return null
}

function inferDelimiter(text: string): string {
  if (text.includes(';')) return ';'
  if (text.includes('\t')) return '\t'
  return ','
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export default function ClinicPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(DEMO_COMPANIES[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCommit, setLoadingCommit] = useState(false)

  const supabase = useMemo(() => {
    if (DEMO_MODE_ENABLED) return null
    return getSupabaseBrowserClient()
  }, [])

  const logout = async () => {
    if (DEMO_MODE_ENABLED) {
      await fetch('/api/auth/demo-logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
      return
    }

    if (!supabase) {
      router.push('/login')
      return
    }

    await supabase.auth.signOut()
    router.push('/login')
  }

  const mapping = {
    external_employee_id: 'matricula',
    full_name: 'nome',
    cpf: 'cpf',
    email: 'email',
    whatsapp: 'whatsapp',
    setor_nome: 'setor',
    ghe_nome: 'ghe',
  }

  const handlePreview = async () => {
    setError(null)
    setStatus(null)
    setPreview(null)

    if (!file) {
      setError('Selecione um arquivo para preview.')
      return
    }

    if (!companyId.trim()) {
      setError('Informe o companyId da empresa alvo.')
      return
    }

    const format = detectFormat(file.name)
    if (!format) {
      setError('Formato invalido. Envie .txt, .csv ou .xlsx.')
      return
    }

    setLoadingPreview(true)

    try {
      if (DEMO_MODE_ENABLED) {
        const rows: Record<string, string | number | null>[] = []
        let headers: string[] = []

        if (format === 'xlsx') {
          const xlsx = await import('xlsx')
          const buffer = await file.arrayBuffer()
          const workbook = xlsx.read(buffer, { type: 'array' })
          const firstSheet = workbook.SheetNames[0]
          const sheet = workbook.Sheets[firstSheet]
          const jsonRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
          headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]).map((h) => normalizeHeader(String(h))) : []
          for (const row of jsonRows.slice(0, 20)) {
            const normalized: Record<string, string | number | null> = {}
            for (const [key, value] of Object.entries(row)) {
              normalized[normalizeHeader(key)] = typeof value === 'number' ? value : String(value || '')
            }
            rows.push(normalized)
          }
        } else {
          const text = await file.text()
          const delimiter = inferDelimiter(text)
          const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
          headers = lines[0]?.split(delimiter).map((h) => normalizeHeader(h)) ?? []
          for (const line of lines.slice(1, 21)) {
            const values = line.split(delimiter)
            const row: Record<string, string | number | null> = {}
            headers.forEach((header, index) => {
              row[header] = (values[index] ?? '').trim()
            })
            rows.push(row)
          }
        }

        const totalRows = rows.length
        const validRows = rows.filter((row) => String(row.nome ?? '').trim().length > 0 && String(row.cpf ?? '').trim().length > 0).length

        setPreview({
          importJobId: `demo-job-${Date.now()}`,
          detectedColumns: headers,
          previewRows: rows.slice(0, 10),
          validationSummary: {
            totalRows,
            validRows,
            invalidRows: Math.max(0, totalRows - validRows),
            duplicateInFile: 0,
            duplicateInDatabase: 0,
          },
        })
        setStatus('Preview demo gerado com sucesso.')
      } else {
        const formData = new FormData()
        formData.append('entityType', 'collaborators')
        formData.append('sourceFormat', format)
        formData.append('companyId', companyId)
        formData.append('mapping', JSON.stringify(mapping))
        formData.append('file', file)

        const response = await fetch('/api/imports/preview', {
          method: 'POST',
          body: formData,
        })

        const json = (await response.json()) as
          | { ok: true; data: PreviewData }
          | { ok: false; error?: { message?: string; details?: string[] } }

        if (!response.ok || !json.ok) {
          throw new Error(json.ok ? 'Falha ao gerar preview.' : json.error?.message ?? 'Falha ao gerar preview.')
        }

        setPreview(json.data)
        setStatus('Preview gerado. Revise os dados antes do commit.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar preview.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleCommit = async () => {
    if (!preview) return
    setLoadingCommit(true)
    setError(null)

    try {
      if (DEMO_MODE_ENABLED) {
        setStatus('Importacao demo concluida: links de questionario preparados para envio.')
        return
      }

      const response = await fetch('/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importJobId: preview.importJobId,
          conflictStrategy: 'upsert',
          mapping,
        }),
      })

      const json = (await response.json()) as
        | { ok: true; data: { summary: { importedRows: number; invalidRows: number; ignoredRows: number } } }
        | { ok: false; error?: { message?: string } }

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? 'Falha no commit.' : json.error?.message ?? 'Falha no commit.')
      }

      setStatus(
        `Importacao concluida. Importados: ${json.data.summary.importedRows} | Invalidos: ${json.data.summary.invalidRows} | Ignorados: ${json.data.summary.ignoredRows}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao confirmar importacao.')
    } finally {
      setLoadingCommit(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest font-black text-cyan-700">Area Clinica</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Importacao de Empregados para Questionarios</h1>
            <p className="text-sm text-slate-600 mt-2">Importe CPF, WhatsApp e e-mail para preparar envios de links.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/dashboard')} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">
              Dashboard
            </button>
            <button onClick={logout} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">
              Sair
            </button>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              placeholder="companyId da empresa"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              type="file"
              accept=".csv,.txt,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={handlePreview}
              disabled={loadingPreview}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {loadingPreview ? 'Processando...' : 'Gerar Preview'}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Colunas esperadas no layout base: <span className="font-bold">matricula, nome, cpf, whatsapp, email, setor, ghe</span>
          </div>

          {error ? <p className="text-sm text-rose-700 font-medium">{error}</p> : null}
          {status ? <p className="text-sm text-emerald-700 font-medium">{status}</p> : null}
        </section>

        {preview ? (
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">Preview da Importacao</p>
              <button
                onClick={handleCommit}
                disabled={loadingCommit}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-60"
              >
                {loadingCommit ? 'Confirmando...' : 'Confirmar Importacao'}
              </button>
            </div>

            <div className="grid md:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
              <div>Total: <span className="font-bold">{preview.validationSummary.totalRows}</span></div>
              <div>Validas: <span className="font-bold text-emerald-700">{preview.validationSummary.validRows}</span></div>
              <div>Invalidas: <span className="font-bold text-rose-700">{preview.validationSummary.invalidRows}</span></div>
              <div>Dup. arquivo: <span className="font-bold">{preview.validationSummary.duplicateInFile}</span></div>
              <div>Dup. banco: <span className="font-bold">{preview.validationSummary.duplicateInDatabase}</span></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
                  <tr>
                    {preview.detectedColumns.map((column) => (
                      <th key={column} className="text-left px-4 py-3">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {preview.detectedColumns.map((column) => (
                        <td key={column} className="px-4 py-3 text-slate-700">{String(row[column] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
