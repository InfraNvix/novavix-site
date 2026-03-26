import { DEMO_COMPANY_AUTH } from '@/lib/auth/demo'

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCnpjFormat(value: string): boolean {
  const normalized = normalizeCnpj(value)
  if (!/^\d{14}$/.test(normalized)) {
    return false
  }

  if (/^(\d)\1{13}$/.test(normalized)) {
    return false
  }

  const digits = normalized.split('').map((digit) => Number(digit))
  const calcDigit = (base: number[], factors: number[]): number => {
    const total = base.reduce((acc, current, index) => acc + current * factors[index], 0)
    const mod = total % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const firstDigit = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const secondDigit = calcDigit([...digits.slice(0, 12), firstDigit], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return firstDigit === digits[12] && secondDigit === digits[13]
}

export function isDemoCnpj(value: string): boolean {
  return normalizeCnpj(value) === DEMO_COMPANY_AUTH.cnpj
}
