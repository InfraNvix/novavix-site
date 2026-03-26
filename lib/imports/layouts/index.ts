import type { ImportEntityType, ImportLayoutProfile } from '@/lib/imports/types'
import { collaboratorsLayoutProfile } from '@/lib/imports/layouts/collaborators'
import { sectorsLayoutProfile } from '@/lib/imports/layouts/sectors'
import { ghesLayoutProfile } from '@/lib/imports/layouts/ghes'

const layoutProfiles: Record<ImportEntityType, ImportLayoutProfile> = {
  collaborators: collaboratorsLayoutProfile,
  sectors: sectorsLayoutProfile,
  ghes: ghesLayoutProfile,
}

export function getImportLayoutProfile(entityType: ImportEntityType): ImportLayoutProfile {
  return layoutProfiles[entityType]
}
