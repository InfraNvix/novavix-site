import type { ImportCommitResponse } from '@/lib/imports/types'
import { getImportJobById, markImportJobAsCommitted } from '@/lib/imports/repositories/import-job-repository'

type ProcessImportCommitInput = {
  importJobId: string
  mapping?: Record<string, string> | null
}

export async function processImportCommit(input: ProcessImportCommitInput): Promise<ImportCommitResponse> {
  const existingJob = await getImportJobById(input.importJobId)
  if (!existingJob) {
    throw new Error('IMPORT_JOB_NOT_FOUND')
  }

  return markImportJobAsCommitted({
    importJobId: input.importJobId,
    mapping: input.mapping ?? null,
  })
}
