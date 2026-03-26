import * as XLSX from 'xlsx'
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
  if (raw instanceof Date) {
    return raw.toISOString()
  }
  const text = String(raw).trim()
  return text.length > 0 ? text : null
}

export async function parseXlsxBuffer(input: Buffer, options?: ImportParserOptions): Promise<ImportTableData> {
  const workbook = XLSX.read(input, { type: 'buffer', raw: true, cellDates: true })
  const preferredSheetName = options?.sheetName?.trim()
  const targetSheetName =
    preferredSheetName && workbook.SheetNames.includes(preferredSheetName)
      ? preferredSheetName
      : workbook.SheetNames[0]

  if (!targetSheetName) {
    throw new Error('IMPORT_XLSX_EMPTY_WORKBOOK')
  }

  const sheet = workbook.Sheets[targetSheetName]
  if (!sheet) {
    throw new Error('IMPORT_XLSX_SHEET_NOT_FOUND')
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    blankrows: true,
    defval: null,
  }) as unknown[][]

  if (matrix.length === 0) {
    throw new Error('IMPORT_FILE_EMPTY')
  }

  const rawHeader = matrix[0] ?? []
  const normalizedHeader = makeUniqueColumns(rawHeader.map((item, idx) => normalizeHeader(item, idx)))
  if (normalizedHeader.length === 0 || normalizedHeader.every((col) => col.trim().length === 0)) {
    throw new Error('IMPORT_HEADER_INVALID')
  }

  const warnings: string[] = []
  const rows: Record<string, string | number | null>[] = []
  let emptyRowsSkipped = 0
  let invalidRowsSkipped = 0

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const rawRow = matrix[rowIndex] ?? []
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
  warnings.push(`Aba utilizada: "${targetSheetName}".`)

  return {
    columns: normalizedHeader,
    rows,
    meta: {
      sourceFormat: 'xlsx',
      totalRowsRead: Math.max(matrix.length - 1, 0),
      emptyRowsSkipped,
      invalidRowsSkipped,
      warnings,
    },
  }
}
