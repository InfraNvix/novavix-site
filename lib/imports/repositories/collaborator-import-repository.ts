import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type ImportCollaboratorRow = {
  externalEmployeeId: string
  fullName: string | null
  email: string | null
  setorNome: string | null
  gheNome: string | null
  cpfHash: string | null
}

export async function getExistingCollaboratorExternalIds(
  companyId: string,
  externalEmployeeIds: string[]
): Promise<Set<string>> {
  if (externalEmployeeIds.length === 0) {
    return new Set()
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('copsoq_collaborators')
    .select('external_employee_id')
    .eq('company_id', companyId)
    .in('external_employee_id', externalEmployeeIds)

  if (error || !data) {
    throw new Error('IMPORT_COLLABORATOR_EXISTING_QUERY_FAILED')
  }

  return new Set(
    data
      .map((item) => item.external_employee_id as string | null)
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  )
}

export async function upsertCollaboratorsForCompany(companyId: string, rows: ImportCollaboratorRow[]): Promise<number> {
  if (rows.length === 0) {
    return 0
  }

  const nowIso = new Date().toISOString()
  const supabase = getSupabaseAdminClient()

  const payload = rows.map((row) => ({
    company_id: companyId,
    external_employee_id: row.externalEmployeeId,
    full_name: row.fullName,
    email: row.email,
    cpf_hash: row.cpfHash,
    setor_nome: row.setorNome,
    ghe_nome: row.gheNome,
    is_active: true,
    updated_at: nowIso,
  }))

  const { error } = await supabase
    .from('copsoq_collaborators')
    .upsert(payload, { onConflict: 'company_id,external_employee_id' })

  if (error) {
    throw new Error('IMPORT_COLLABORATOR_UPSERT_FAILED')
  }

  return rows.length
}
