import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type CopsoqCollaboratorOrgSyncInput = {
  companyId: string
  externalEmployeeId: string
  setorId: string | null
  setorNome: string | null
  gheId: string | null
  gheNome: string | null
}

export async function syncCollaboratorOrgScope(input: CopsoqCollaboratorOrgSyncInput): Promise<string | null> {
  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('copsoq_collaborators')
    .update({
      setor_id: input.setorId,
      setor_nome: input.setorNome,
      ghe_id: input.gheId,
      ghe_nome: input.gheNome,
      updated_at: nowIso,
    })
    .eq('company_id', input.companyId)
    .eq('external_employee_id', input.externalEmployeeId)
    .select('id')
    .maybeSingle()

  const row = data as { id: string } | null

  if (error) {
    throw new Error('COPSOQ_COLLABORATOR_ORG_SYNC_FAILED')
  }

  return row?.id ?? null
}
