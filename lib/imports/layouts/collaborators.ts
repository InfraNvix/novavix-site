import type { ImportLayoutProfile } from '@/lib/imports/types'

export const collaboratorsLayoutProfile: ImportLayoutProfile = {
  entityType: 'collaborators',
  key: 'collaborators.default.v1',
  displayName: 'Colaboradores - Padrao',
  supportedFormats: ['txt', 'csv', 'xlsx'],
  fields: [
    { key: 'externalEmployeeId', label: 'ID Externo', required: true, aliases: ['id', 'matricula', 'codigo'] },
    { key: 'fullName', label: 'Nome Completo', required: true, aliases: ['nome', 'colaborador'] },
    { key: 'email', label: 'E-mail', required: false, aliases: ['mail'] },
    { key: 'cpf', label: 'CPF', required: false, aliases: ['documento'] },
    { key: 'setorNome', label: 'Setor', required: false, aliases: ['setor'] },
    { key: 'gheNome', label: 'GHE', required: false, aliases: ['ghe'] },
  ],
}
