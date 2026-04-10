import * as XLSX from 'xlsx'

export type FormFieldType = 'text' | 'number' | 'select' | 'date' | 'boolean' | 'section'

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

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  })

  const normalizedRows = rows
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []))
    .filter((row) => row.length > 0)

  const shouldIgnoreRow = (value: string): boolean => {
    const text = normalizeText(value)
    if (!text) return true

    // Ignore common header/instruction lines in survey sheets.
    const ignoreTerms = [
      'copsoq',
      'versao',
      'tradu',
      'adaptacao',
      'indique',
      '(x)',
      'escala',
      'obrigado pela sua colaboracao',
      'obrigado pela sua colaboração',
      'agradecemos',
    ]
    if (ignoreTerms.some((term) => text.includes(term))) {
      return true
    }

    // Ignore explicit 1-5 scale lines.
    const hasScaleNumbers = ['1', '2', '3', '4', '5'].every((value) => text.includes(value))
    if (hasScaleNumbers && text.length < 120) {
      return true
    }

    // Ignore lines that are likely citations or metadata.
    if (text.includes('(') && text.includes(')') && text.length < 120 && !text.endsWith('?')) {
      return true
    }

    return false
  }

  const findLikertOptions = (): string[] | null => {
    for (const row of normalizedRows) {
      const cells = row.map((cell) => cell.replace(/\s+/g, ' ').trim()).filter((cell) => cell.length > 0)
      if (cells.length === 0) continue

      const hasNumbers = ['1', '2', '3', '4', '5'].every((value) => cells.includes(value))
      if (hasNumbers) {
        return ['1', '2', '3', '4', '5']
      }

      const joined = cells.join(' ')
      if (joined.includes('1') && joined.includes('2') && joined.includes('3') && joined.includes('4') && joined.includes('5')) {
        const matches = Array.from(
          joined.matchAll(/([1-5])\s*[-:]\s*([^1-5]{2,}?)(?=\s+[1-5]\s*[-:]|$)/g)
        )
        if (matches.length > 0) {
          const options = matches
            .map((match) => `${match[1]} - ${match[2].trim()}`)
            .filter((option) => option.length > 0)
          if (options.length >= 2) {
            return options
          }
        }
      }
    }
    return null
  }

  if (normalizedRows.length === 0) {
    throw new Error('FORM_XLSX_HEADER_EMPTY')
  }

  const firstNonEmptyRowIndex = normalizedRows.findIndex((row) => row.some((cell) => cell.length > 0))
  if (firstNonEmptyRowIndex < 0) {
    throw new Error('FORM_XLSX_HEADER_EMPTY')
  }

  const headerRow = normalizedRows[firstNonEmptyRowIndex]
  const headerLabels = headerRow.filter((cell) => cell.length > 0)
  const likertOptions = findLikertOptions()
  const isScaleRow = (row: string[]): boolean => {
    const normalized = row.map((cell) => normalizeText(cell)).filter((cell) => cell.length > 0)
    if (normalized.length === 0) return false
    const hasNumbers = ['1', '2', '3', '4', '5'].every((value) => normalized.includes(value))
    if (hasNumbers) return true
    const joined = normalized.join(' ')
    if (joined.includes('1') && joined.includes('2') && joined.includes('3') && joined.includes('4') && joined.includes('5')) {
      return true
    }
    return false
  }

  const isSectionRow = (value: string, row: string[]): boolean => {
    const raw = value.replace(/\s+/g, ' ').trim()
    if (!raw) return false
    if (raw.length < 12) return false
    if (raw.endsWith('?')) return false
    if (/^\d+\s*[-.]/.test(raw)) return false
    if (/^\d+\s/.test(raw)) return false
    const normalized = normalizeText(raw)
    if (raw.endsWith('...') || raw.includes('...')) return true
    if (raw.endsWith(':')) return true
    if (isScaleRow(row)) return true
    if (raw.length >= 90) return true
    if (normalized.includes('referem-se') || normalized.includes('referem se')) return true
    if (normalized.includes('as proximas')) return true
    if (normalized.includes('com que frequencia')) return true
    if (normalized.includes('em relacao a sua chefia')) return true
    if (normalized.includes('nos ultimos')) return true
    if (normalized.includes('das seguintes afirmacoes')) return true
    if (normalized.includes('modo como') && normalized.includes('afeta')) return true
    if (normalized.includes('durante as ultimas') && normalized.includes('semanas')) return true
    return false
  }

  // If there is only one header and many rows below, treat the first column as question list.
  if (headerLabels.length === 1) {
    const titleCandidate = headerLabels[0]
    const rowsAfterHeader = normalizedRows
      .slice(firstNonEmptyRowIndex + 1)
      .map((row) => row.map((cell) => String(cell).trim()))
      .filter((row) => row.some((cell) => cell.length > 0))

    if (rowsAfterHeader.length >= 2) {
      const fields: FormFieldSchema[] = []
      let sectionIndex = 1
      const seenLabels = new Set<string>()
      const seenSections = new Set<string>()

      for (const row of rowsAfterHeader) {
        const rawValue = row[0] ?? ''
        const value = String(rawValue).trim()
        if (!value) {
          continue
        }
        if (isScaleRow(row)) {
          continue
        }
        if (isSectionRow(value, row)) {
          const sectionKey = normalizeText(value)
          if (seenSections.has(sectionKey)) {
            continue
          }
          seenSections.add(sectionKey)
          fields.push({
            key: `section_${sectionIndex}`,
            label: safeLabel(value),
            type: 'section',
            required: false,
          })
          sectionIndex += 1
          continue
        }
        if (shouldIgnoreRow(value)) {
          continue
        }
        const labelKey = normalizeKey(value)
        if (seenLabels.has(labelKey)) {
          continue
        }
        seenLabels.add(labelKey)
        fields.push({
          key: labelKey,
          label: safeLabel(value),
          type: likertOptions ? 'select' : 'text',
          required: true,
          options: likertOptions ?? undefined,
        })
      }

      return {
        title: titleCandidate || templateName,
        fields: dedupeFields(fields),
      }
    }
  }

  const fields: FormFieldSchema[] = headerLabels.map((label) => ({
    key: normalizeKey(label),
    label: safeLabel(label),
    type: likertOptions ? 'select' : 'text',
    required: true,
    options: likertOptions ?? undefined,
  }))

  if (fields.length === 0) {
    throw new Error('FORM_XLSX_HEADER_EMPTY')
  }

  return {
    title: templateName,
    fields: dedupeFields(fields),
  }
}
