export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCnpjFormat(value: string): boolean {
  return /^\d{14}$/.test(normalizeCnpj(value))
}

