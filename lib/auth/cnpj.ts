import { DEMO_COMPANY_AUTH } from '@/lib/auth/demo'

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCnpjFormat(value: string): boolean {
  return /^\d{14}$/.test(normalizeCnpj(value))
}

export function isDemoCnpj(value: string): boolean {
  return normalizeCnpj(value) === DEMO_COMPANY_AUTH.cnpj
}
