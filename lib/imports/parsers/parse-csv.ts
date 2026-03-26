import { parse } from 'csv-parse/sync'
import type { ImportParserOptions, ImportTableData } from '@/lib/imports/types'

function normalizeHeader(raw: unknown, index: number): string {
  const base = String(raw ?? '').trim()
  return base.length > 0 ? base : `column_${index + 1}`
}

function makeUniqueColumns(input: string[]): string[] {
  const counts = new Map<string, number>()
  return input.map((column) => {
    const current = counts.get(column) ?? 0
    counts.set(column, current + 1)
    if (current === 0) {
      return column
    }
    return `${column}_${current + 1}`
  })
}

function normalizeCell(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) {
    return null
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null
  }
  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

export async function parseCsvBuffer(input: Buffer, options?: ImportParserOptions): Promise<ImportTableData> {
  const text = input.toString('utf8')
  const delimiter = options?.delimiter && options.delimiter.length > 0 ? options.delimiter : ','
  const records = parse(text, {
    bom: true,
    delimiter,
    relax_column_count: true,
    skip_empty_lines: false,
  }) as unknown[][]

  if (records.length === 0) {
    throw new Error('IMPORT_FILE_EMPTY')
  }

  const rawHeader = records[0] ?? []
  const normalizedHeader = makeUniqueColumns(rawHeader.map((item, idx) => normalizeHeader(item, idx)))
  if (normalizedHeader.length === 0 || normalizedHeader.every((col) => col.trim().length === 0)) {
    throw new Error('IMPORT_HEADER_INVALID')
  }

  const warnings: string[] = []
  const rows: Record<string, string | number | null>[] = []
  let emptyRowsSkipped = 0
  let invalidRowsSkipped = 0

  for (let rowIndex = 1; rowIndex < records.length; rowIndex += 1) {
    const rawRow = records[rowIndex] ?? []
    const extraValues = rawRow.slice(normalizedHeader.length).map((value) => normalizeCell(value))
    const hasExtraData = extraValues.some((value) => value !== null)

    if (hasExtraData) {
      invalidRowsSkipped += 1
      continue
    }

    const mappedRow: Record<string, string | number | null> = {}
    for (let colIndex = 0; colIndex < normalizedHeader.length; colIndex += 1) {
      mappedRow[normalizedHeader[colIndex]] = normalizeCell(rawRow[colIndex])
    }

    const isEmpty = Object.values(mappedRow).every((value) => value === null)
    if (isEmpty) {
      emptyRowsSkipped += 1
      continue
    }

    rows.push(mappedRow)
  }

  if (invalidRowsSkipped > 0) {
    warnings.push(`${invalidRowsSkipped} linha(s) ignorada(s) por excesso de colunas.`)
  }

  return {
    columns: normalizedHeader,
    rows,
    meta: {
      sourceFormat: 'csv',
      totalRowsRead: Math.max(records.length - 1, 0),
      emptyRowsSkipped,
      invalidRowsSkipped,
      warnings,
    },
  }
}
