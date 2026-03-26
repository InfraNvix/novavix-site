export type CopsoqCollaboratorOrgSyncInput = {
  companyId: string
  externalEmployeeId: string
  setorId: string | null
  setorNome: string | null
  gheId: string | null
  gheNome: string | null
}

type SyncValidationSuccess = {
  success: true
  data: CopsoqCollaboratorOrgSyncInput
}

type SyncValidationFailure = {
  success: false
  errors: string[]
}

export type CopsoqCollaboratorOrgSyncValidationResult = SyncValidationSuccess | SyncValidationFailure

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asOptionalTrimmedString(value: unknown): string | null {
  return asTrimmedString(value) ?? null
}

export function parseCopsoqCollaboratorOrgSyncPayload(
  input: unknown
): CopsoqCollaboratorOrgSyncValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  const payload = input as Record<string, unknown>
  const errors: string[] = []

  const companyId = asTrimmedString(payload.companyId)
  const externalEmployeeId = asTrimmedString(payload.externalEmployeeId)

  if (!companyId) {
    errors.push('Campo "companyId" e obrigatorio.')
  }

  if (!externalEmployeeId) {
    errors.push('Campo "externalEmployeeId" e obrigatorio.')
  }

  if (errors.length > 0 || !companyId || !externalEmployeeId) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      companyId,
      externalEmployeeId,
      setorId: asOptionalTrimmedString(payload.setorId),
      setorNome: asOptionalTrimmedString(payload.setorNome),
      gheId: asOptionalTrimmedString(payload.gheId),
      gheNome: asOptionalTrimmedString(payload.gheNome),
    },
  }
}
