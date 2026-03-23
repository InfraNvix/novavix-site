type PasswordValidationResult = {
  valid: boolean
  errors: string[]
}

export const PASSWORD_MIN_LENGTH = 10

export function validateStrongPassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter ao menos uma letra maiuscula.')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter ao menos uma letra minuscula.')
  }

  if (!/\d/.test(password)) {
    errors.push('Senha deve conter ao menos um numero.')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Senha deve conter ao menos um caractere especial.')
  }

  return { valid: errors.length === 0, errors }
}

