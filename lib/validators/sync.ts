export type SyncPayload = {
  cnpj: string
  nome_cliente: string
  tipo_documento: string
  url_pdf: string
}

type ValidationSuccess = {
  success: true
  data: SyncPayload
}

type ValidationFailure = {
  success: false
  errors: string[]
}

type ValidationResult = ValidationSuccess | ValidationFailure

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseSyncPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload must be a valid JSON object.'] }
  }

  const payload = input as Record<string, unknown>
  const errors: string[] = []

  const cnpjValue = isNonEmptyString(payload.cnpj) ? sanitizeCnpj(payload.cnpj) : ''
  const nomeCliente = isNonEmptyString(payload.nome_cliente) ? payload.nome_cliente.trim() : ''
  const tipoDocumento = isNonEmptyString(payload.tipo_documento) ? payload.tipo_documento.trim() : ''
  const urlPdf = isNonEmptyString(payload.url_pdf) ? payload.url_pdf.trim() : ''

  if (cnpjValue.length !== 14) {
    errors.push('Field "cnpj" must contain exactly 14 digits.')
  }

  if (!nomeCliente || nomeCliente.length > 255) {
    errors.push('Field "nome_cliente" is required and must be at most 255 characters.')
  }

  if (!tipoDocumento || tipoDocumento.length > 120) {
    errors.push('Field "tipo_documento" is required and must be at most 120 characters.')
  }

  if (!urlPdf || !isValidUrl(urlPdf)) {
    errors.push('Field "url_pdf" is required and must be a valid URL.')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      cnpj: cnpjValue,
      nome_cliente: nomeCliente,
      tipo_documento: tipoDocumento,
      url_pdf: urlPdf,
    },
  }
}

