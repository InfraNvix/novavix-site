import type { ImportLayoutProfile } from '@/lib/imports/types'

export const sectorsLayoutProfile: ImportLayoutProfile = {
  entityType: 'sectors',
  key: 'sectors.default.v1',
  displayName: 'Setores - Estrutural',
  supportedFormats: ['txt', 'csv', 'xlsx'],
  fields: [
    { key: 'externalSectorId', label: 'ID Externo do Setor', required: true, aliases: ['id_setor', 'codigo_setor'] },
    { key: 'name', label: 'Nome do Setor', required: true, aliases: ['setor'] },
  ],
}
