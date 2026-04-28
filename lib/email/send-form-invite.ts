import nodemailer from 'nodemailer'

type SendFormInviteInput = {
  to: string
  collaboratorName: string | null
  templateName: string
  formUrl: string
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

  const subject = `Convite para responder formulario: ${input.templateName}`
  const textBody = [
    `Ola, ${collaboratorDisplayName}.`,
    '',
    `Voce foi convidado(a) para responder o formulario "${input.templateName}".`,
    `Acesse pelo link: ${input.formUrl}`,
    '',
    'Se voce nao reconhece este convite, ignore este email.',
  ].join('\n')

  const htmlBody = `
    <p>Ola, ${collaboratorDisplayName}.</p>
    <p>Voce foi convidado(a) para responder o formulario <strong>${input.templateName}</strong>.</p>
    <p><a href="${input.formUrl}">Clique aqui para abrir o formulario</a></p>
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

