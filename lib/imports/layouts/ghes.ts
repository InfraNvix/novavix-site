import type { ImportLayoutProfile } from '@/lib/imports/types'

export const ghesLayoutProfile: ImportLayoutProfile = {
  entityType: 'ghes',
  key: 'ghes.default.v1',
  displayName: 'GHEs - Estrutural',
  supportedFormats: ['txt', 'csv', 'xlsx'],
  fields: [
    { key: 'externalGheId', label: 'ID Externo do GHE', required: true, aliases: ['id_ghe', 'codigo_ghe'] },
    { key: 'name', label: 'Nome do GHE', required: true, aliases: ['ghe'] },
  ],
}
