import * as XLSX from 'xlsx'

export type FormFieldType = 'text' | 'number' | 'select' | 'date' | 'boolean'

export type FormFieldSchema = {
  key: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
}

export type FormTemplateSchema = {
  title: string
  fields: FormFieldSchema[]
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function safeLabel(value: string): string {
  const v = value.trim()
  return v.length > 0 ? v : 'Campo'
}

function dedupeFields(fields: FormFieldSchema[]): FormFieldSchema[] {
  const seen = new Set<string>()
  const output: FormFieldSchema[] = []
  for (const field of fields) {
    const base = field.key.length > 0 ? field.key : 'campo'
    let key = base
    let suffix = 2
    while (seen.has(key)) {
      key = `${base}_${suffix}`
      suffix += 1
    }
    seen.add(key)
    output.push({ ...field, key })
  }
  return output
}

function inferFieldType(value: unknown): FormFieldType {
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return 'date'
  }
  return 'text'
}

export function parseJsonTemplate(content: string): FormTemplateSchema {
  const raw = JSON.parse(content) as unknown
  if (!raw || typeof raw !== 'object') {
    throw new Error('FORM_JSON_INVALID')
  }

  const payload = raw as Record<string, unknown>
  const title = typeof payload.title === 'string' && payload.title.trim().length > 0 ? payload.title.trim() : 'Formulario'
  const fieldsRaw = Array.isArray(payload.fields) ? payload.fields : null
  if (!fieldsRaw) {
    throw new Error('FORM_JSON_FIELDS_REQUIRED')
  }

  const fields = fieldsRaw
    .map((item): FormFieldSchema | null => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const row = item as Record<string, unknown>
      const label = safeLabel(String(row.label ?? row.key ?? 'Campo'))
      const keyRaw = typeof row.key === 'string' ? row.key : label
      const typeRaw = typeof row.type === 'string' ? row.type.trim().toLowerCase() : ''
      const type: FormFieldType =
        typeRaw === 'number' || typeRaw === 'select' || typeRaw === 'date' || typeRaw === 'boolean'
          ? (typeRaw as FormFieldType)
          : 'text'

      const options =
        type === 'select' && Array.isArray(row.options)
          ? row.options.map((opt) => String(opt).trim()).filter((opt) => opt.length > 0).slice(0, 100)
          : undefined

      const parsed: FormFieldSchema = {
        key: normalizeKey(keyRaw),
        label,
        type,
        required: Boolean(row.required),
      }

      if (options && options.length > 0) {
        parsed.options = options
      }

      return parsed
    })
    .filter((item): item is FormFieldSchema => item !== null)

  if (fields.length === 0) {
    throw new Error('FORM_JSON_FIELDS_EMPTY')
  }

  return {
    title,
    fields: dedupeFields(fields),
  }
}

export function parseCsvTemplate(content: string, templateName: string): FormTemplateSchema {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new Error('FORM_CSV_EMPTY')
  }

  const header = lines[0]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (header.length === 0) {
    throw new Error('FORM_CSV_HEADER_EMPTY')
  }

  const fields: FormFieldSchema[] = header.map((label) => ({
    key: normalizeKey(label),
    label: safeLabel(label),
    type: 'text',
    required: false,
  }))

  return {
    title: templateName,
    fields: dedupeFields(fields),
  }
}

export function parseXlsxTemplate(fileBuffer: Buffer, templateName: string): FormTemplateSchema {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) {
    throw new Error('FORM_XLSX_EMPTY')
  }

  const sheet = workbook.Sheets[firstSheet]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  })

  const header = rows.length > 0 ? Object.keys(rows[0]) : []
  if (header.length === 0) {
    throw new Error('FORM_XLSX_HEADER_EMPTY')
  }

  const sample = rows[0] ?? {}
  const fields: FormFieldSchema[] = header.map((label) => ({
    key: normalizeKey(label),
    label: safeLabel(label),
    type: inferFieldType(sample[label]),
    required: false,
  }))

  return {
    title: templateName,
    fields: dedupeFields(fields),
  }
}
