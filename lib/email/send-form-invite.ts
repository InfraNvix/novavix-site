import nodemailer from 'nodemailer'

type SendFormInviteInput = {
  to: string
  collaboratorName: string | null
  templateName: string
  formUrl: string
  expiresAtIso?: string | null
  subject?: string | null
}

let cachedTransporter: nodemailer.Transporter | null = null

function getRequiredEnv(name: 'GMAIL_USER' | 'GMAIL_APP_PASSWORD'): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`MISSING_${name}`)
  }
  return value.trim()
}

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: getRequiredEnv('GMAIL_USER'),
      pass: getRequiredEnv('GMAIL_APP_PASSWORD'),
    },
  })

  return cachedTransporter
}

export async function sendFormInvite(input: SendFormInviteInput): Promise<{ messageId: string | null }> {
  const fromAddress = getRequiredEnv('GMAIL_USER')
  const collaboratorDisplayName = input.collaboratorName?.trim() || 'colaborador(a)'
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
    <p>Ola, ${collaboratorDisplayName}.</p>
    <p>Voce foi convidado(a) para responder o formulario <strong>${input.templateName}</strong>.</p>
    <p><a href="${input.formUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Abrir formulario</a></p>
    ${expiryText ? `<p><strong>Validade do link:</strong> ${expiryText}.</p>` : ''}
    <p>Se preferir, copie e cole este link no navegador:</p>
    <p><a href="${input.formUrl}">${input.formUrl}</a></p>
    <p>Se voce nao reconhece este convite, ignore este email.</p>
  `

  const info = await getTransporter().sendMail({
    from: `"Novavix" <${fromAddress}>`,
    to: input.to,
    subject,
    text: textBody,
    html: htmlBody,
  })

  return {
    messageId: info.messageId ?? null,
  }
}
