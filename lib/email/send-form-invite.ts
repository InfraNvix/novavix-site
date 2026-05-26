import { Resend } from 'resend'

type SendFormInviteInput = {
  to: string
  collaboratorName: string | null
  templateName: string
  formUrl: string
  expiresAtIso?: string | null
  subject?: string | null
}

let cachedResend: Resend | null = null

function getRequiredEnv(name: 'RESEND_API_KEY' | 'EMAIL_FROM'): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`MISSING_${name}`)
  }
  return value.trim()
}

function getResendClient(): Resend {
  if (cachedResend) {
    return cachedResend
  }

  cachedResend = new Resend(getRequiredEnv('RESEND_API_KEY'))
  return cachedResend
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendFormInvite(input: SendFormInviteInput): Promise<{ messageId: string | null }> {
  const fromAddress = getRequiredEnv('EMAIL_FROM')
  const collaboratorDisplayName = input.collaboratorName?.trim() || 'colaborador(a)'
  const safeCollaboratorDisplayName = escapeHtml(collaboratorDisplayName)
  const safeTemplateName = escapeHtml(input.templateName)
  const safeFormUrl = escapeHtml(input.formUrl)
  const hasExpiry = typeof input.expiresAtIso === 'string' && input.expiresAtIso.trim().length > 0
  const expiryText = hasExpiry
    ? new Date(input.expiresAtIso as string).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const subject = input.subject?.trim() || `Convite para responder formulario: ${input.templateName}`
  const textBody = [
    `Ola, ${collaboratorDisplayName}.`,
    '',
    `Voce foi convidado(a) para responder o formulario "${input.templateName}".`,
    `Acesse pelo link: ${input.formUrl}`,
    expiryText ? `Validade do link: ${expiryText}.` : null,
    '',
    'Se voce nao reconhece este convite, ignore este email.',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  const htmlBody = `
    <p>Ola, ${safeCollaboratorDisplayName}.</p>
    <p>Voce foi convidado(a) para responder o formulario <strong>${safeTemplateName}</strong>.</p>
    <p><a href="${safeFormUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Abrir formulario</a></p>
    ${expiryText ? `<p><strong>Validade do link:</strong> ${expiryText}.</p>` : ''}
    <p>Se preferir, copie e cole este link no navegador:</p>
    <p><a href="${safeFormUrl}">${safeFormUrl}</a></p>
    <p>Se voce nao reconhece este convite, ignore este email.</p>
  `

  const resend = getResendClient()
  const result = await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject,
    text: textBody,
    html: htmlBody,
  })

  if (result.error) {
    throw new Error('RESEND_SEND_FAILED')
  }

  return {
    messageId: result.data?.id ?? null,
  }
}
