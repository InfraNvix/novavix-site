import type { ImportCommitResponse } from '@/lib/imports/types'
import { createHash } from 'node:crypto'
import {
  getImportJobCommitPayload,
  markImportJobAsCommitted,
} from '@/lib/imports/repositories/import-job-repository'
import {
  getExistingCollaboratorExternalIds,
  upsertCollaboratorsForCompany,
  type ImportCollaboratorRow,
} from '@/lib/imports/repositories/collaborator-import-repository'

type ProcessImportCommitInput = {
  importJobId: string
  mapping?: Record<string, string> | null
  conflictStrategy: 'skip' | 'upsert' | 'error'
}

function asTrimmed(value: unknown): string | null {
  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function hashCpf(cpf: string | null): string | null {
  if (!cpf) {
    return null
  }

  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) {
    return null
  }

  return createHash('sha256').update(digits).digest('hex')
}

function resolveMappingColumn(mapping: Record<string, string>, key: string): string | null {
  const col = mapping[key]
  return typeof col === 'string' && col.trim().length > 0 ? col : null
}

export async function processImportCommit(input: ProcessImportCommitInput): Promise<ImportCommitResponse> {
  const job = await getImportJobCommitPayload(input.importJobId)
  if (!job) {
    throw new Error('IMPORT_JOB_NOT_FOUND')
  }

  if (!job.validationSummary?.table) {
    throw new Error('IMPORT_PREVIEW_DATA_MISSING')
  }

  if (job.entityType !== 'collaborators') {
    throw new Error('IMPORT_ENTITY_NOT_ENABLED')
  }

  const table = job.validationSummary.table
  const mapping = {
    ...(job.mapping ?? {}),
    ...(input.mapping ?? {}),
  }

  const externalEmployeeColumn = resolveMappingColumn(mapping, 'externalEmployeeId')
  const fullNameColumn = resolveMappingColumn(mapping, 'fullName')
  const emailColumn = resolveMappingColumn(mapping, 'email')
  const setorNomeColumn = resolveMappingColumn(mapping, 'setorNome')
  const gheNomeColumn = resolveMappingColumn(mapping, 'gheNome')
  const cpfColumn = resolveMappingColumn(mapping, 'cpf')

  if (!externalEmployeeColumn || !fullNameColumn) {
    throw new Error('IMPORT_REQUIRED_FIELD_UNMAPPED')
  }

  const issues: ImportCommitResponse['issuesSample'] = []
  const seenExternalInFile = new Set<string>()
  const candidateRows: Array<{
    rowNumber: number
    externalEmployeeId: string
    fullName: string
    email: string | null
    setorNome: string | null
    gheNome: string | null
    cpfHash: string | null
  }> = []

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index]
    const rowNumber = index + 2
    const externalEmployeeId = asTrimmed(row[externalEmployeeColumn])
    const fullName = asTrimmed(row[fullNameColumn])

    if (!externalEmployeeId) {
      issues.push({
        rowNumber,
        columnKey: 'externalEmployeeId',
        code: 'IMPORT_REQUIRED_VALUE_MISSING',
        message: 'ID Externo obrigatorio ausente.',
      })
      continue
    }

    if (!fullName) {
      issues.push({
        rowNumber,
        columnKey: 'fullName',
        code: 'IMPORT_REQUIRED_VALUE_MISSING',
        message: 'Nome completo obrigatorio ausente.',
      })
      continue
    }

    if (seenExternalInFile.has(externalEmployeeId)) {
      issues.push({
        rowNumber,
        columnKey: 'externalEmployeeId',
        code: 'IMPORT_DUPLICATE_IN_FILE',
        message: 'ID Externo duplicado no arquivo.',
      })
      continue
    }

    seenExternalInFile.add(externalEmployeeId)

    candidateRows.push({
      rowNumber,
      externalEmployeeId,
      fullName,
      email: emailColumn ? asTrimmed(row[emailColumn]) : null,
      setorNome: setorNomeColumn ? asTrimmed(row[setorNomeColumn]) : null,
      gheNome: gheNomeColumn ? asTrimmed(row[gheNomeColumn]) : null,
      cpfHash: cpfColumn ? hashCpf(asTrimmed(row[cpfColumn])) : null,
    })
  }

  const existingExternalIds = await getExistingCollaboratorExternalIds(
    job.companyId,
    candidateRows.map((row) => row.externalEmployeeId)
  )

  const rowsToPersist: ImportCollaboratorRow[] = []
  let ignoredRows = 0
  for (const row of candidateRows) {
    const alreadyExists = existingExternalIds.has(row.externalEmployeeId)

    if (alreadyExists && input.conflictStrategy === 'error') {
      issues.push({
        rowNumber: row.rowNumber,
        columnKey: 'externalEmployeeId',
        code: 'IMPORT_DUPLICATE_IN_DATABASE',
        message: 'Colaborador ja existe na base e a estrategia atual nao permite sobrescrever.',
      })
      continue
    }

    if (alreadyExists && input.conflictStrategy === 'skip') {
      ignoredRows += 1
      continue
    }

    rowsToPersist.push({
      externalEmployeeId: row.externalEmployeeId,
      fullName: row.fullName,
      email: row.email,
      setorNome: row.setorNome,
      gheNome: row.gheNome,
      cpfHash: row.cpfHash,
    })
  }

  const importedRows = await upsertCollaboratorsForCompany(job.companyId, rowsToPersist)
  const invalidRows = issues.length
  const summary = {
    totalRows: table.rows.length,
    validRows: Math.max(table.rows.length - invalidRows - ignoredRows, 0),
    invalidRows,
    importedRows,
    ignoredRows,
  }

  return markImportJobAsCommitted({
    importJobId: input.importJobId,
    mapping,
    summary,
    issuesSample: issues.slice(0, 50),
    status: invalidRows > 0 && importedRows === 0 ? 'failed' : 'committed',
  })
}
