import type { FormTemplateSchema } from '@/lib/forms/parser'

export type PublicFormTemplate = {
  id: string
  companyId: string
  companyCnpj: string
  templateName: string
  schema: FormTemplateSchema
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  const raw = asTrimmed(value).toLowerCase()
  if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'sim') return true
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'nao') return false
  return null
}

export function validateSubmissionAnswers(
  schema: FormTemplateSchema,
  answersRaw: Record<string, unknown>
): { success: true; normalizedAnswers: Record<string, string | number | boolean | null> } | { success: false; errors: string[] } {
  const errors: string[] = []
  const normalizedAnswers: Record<string, string | number | boolean | null> = {}

  for (const field of schema.fields) {
    const value = answersRaw[field.key]
    const text = asTrimmed(value)
    const hasValue = text.length > 0 || typeof value === 'number' || typeof value === 'boolean'

    if (field.required && !hasValue) {
      errors.push(`Campo obrigatorio ausente: ${field.label}.`)
      continue
    }

    if (!hasValue) {
      normalizedAnswers[field.key] = null
      continue
    }

    if (field.type === 'number') {
      const num = typeof value === 'number' ? value : Number(text)
      if (!Number.isFinite(num)) {
        errors.push(`Campo numerico invalido: ${field.label}.`)
        continue
      }
      normalizedAnswers[field.key] = Number(num)
      continue
    }

    if (field.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        errors.push(`Data invalida (YYYY-MM-DD): ${field.label}.`)
        continue
      }
      normalizedAnswers[field.key] = text
      continue
    }

    if (field.type === 'boolean') {
      const bool = normalizeBoolean(value)
      if (bool === null) {
        errors.push(`Valor booleano invalido: ${field.label}.`)
        continue
      }
      normalizedAnswers[field.key] = bool
      continue
    }

    if (field.type === 'select') {
      const options = field.options ?? []
      if (options.length === 0) {
        errors.push(`Campo select sem opcoes configuradas: ${field.label}.`)
        continue
      }
      const found = options.find((opt) => opt.toLowerCase() === text.toLowerCase())
      if (!found) {
        errors.push(`Opcao invalida para ${field.label}.`)
        continue
      }
      normalizedAnswers[field.key] = found
      continue
    }

    normalizedAnswers[field.key] = text
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, normalizedAnswers }
}

