import { isValidCnpjFormat, normalizeCnpj } from '@/lib/auth/cnpj'
import { validateStrongPassword } from '@/lib/auth/password-policy'

export type CompanyLoginPayload = {
  cnpj: string
  password: string
}

type CompanyLoginSuccess = {
  success: true
  data: CompanyLoginPayload
}

type CompanyLoginFailure = {
  success: false
  errors: string[]
}

export type CompanyLoginValidationResult = CompanyLoginSuccess | CompanyLoginFailure

export function parseCompanyLoginPayload(input: unknown): CompanyLoginValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  const payload = input as Record<string, unknown>
  const errors: string[] = []

  const cnpj = typeof payload.cnpj === 'string' ? normalizeCnpj(payload.cnpj) : ''
  const password = typeof payload.password === 'string' ? payload.password : ''

  if (!isValidCnpjFormat(cnpj)) {
    errors.push('CNPJ invalido. Informe 14 digitos.')
  }

  const passwordValidation = validateStrongPassword(password)
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors)
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      cnpj,
      password,
    },
  }
}

