import type { CopsoqCollaboratorOrgSyncInput } from '@/lib/copsoq/repositories/collaborator-org-repository'
import { syncCollaboratorOrgScope } from '@/lib/copsoq/repositories/collaborator-org-repository'

export async function processCopsoqCollaboratorOrgSync(
  input: CopsoqCollaboratorOrgSyncInput
): Promise<{ collaboratorId: string | null; updated: boolean }> {
  const collaboratorId = await syncCollaboratorOrgScope(input)
  return {
    collaboratorId,
    updated: Boolean(collaboratorId),
  }
}
