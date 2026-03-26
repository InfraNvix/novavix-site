import type { ImportParserOptions, ImportSourceFormat, ImportTableData } from '@/lib/imports/types'
import { parseCsvBuffer } from '@/lib/imports/parsers/parse-csv'
import { parseTxtBuffer } from '@/lib/imports/parsers/parse-txt'
import { parseXlsxBuffer } from '@/lib/imports/parsers/parse-xlsx'

export async function parseImportBuffer(
  format: ImportSourceFormat,
  input: Buffer,
  options?: ImportParserOptions
): Promise<ImportTableData> {
  if (format === 'csv') {
    return parseCsvBuffer(input, options)
  }

  if (format === 'txt') {
    return parseTxtBuffer(input, options)
  }

  return parseXlsxBuffer(input, options)
}
