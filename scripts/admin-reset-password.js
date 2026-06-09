#!/usr/bin/env node

const fs = require('node:fs')
const readline = require('node:readline')
const { createClient } = require('@supabase/supabase-js')
const { MongoClient } = require('mongodb')

const PASSWORD_MIN_LENGTH = 10

function loadEnv(file) {
  if (!fs.existsSync(file)) return

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue

    const match = line.match(/^([^=]+)=(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] ??= value
  }
}

function validateStrongPassword(password) {
  const errors = []
  if (password.length < PASSWORD_MIN_LENGTH) errors.push(`Senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`)
  if (!/[A-Z]/.test(password)) errors.push('Senha deve conter ao menos uma letra maiuscula.')
  if (!/[a-z]/.test(password)) errors.push('Senha deve conter ao menos uma letra minuscula.')
  if (!/\d/.test(password)) errors.push('Senha deve conter ao menos um numero.')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Senha deve conter ao menos um caractere especial.')
  return errors
}

function maskEmail(email) {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(name.length - visible.length, 3))}@${domain}`
}

function askHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin
    const stdout = process.stdout
    const rl = readline.createInterface({ input: stdin, output: stdout })

    stdout.write(query)
    stdin.setRawMode?.(true)

    let value = ''
    const onData = (char) => {
      const key = String(char)
      if (key === '\r' || key === '\n') {
        stdin.setRawMode?.(false)
        stdin.off('data', onData)
        stdout.write('\n')
        rl.close()
        resolve(value)
        return
      }
      if (key === '\u0003') {
        stdout.write('\n')
        process.exit(130)
      }
      if (key === '\b' || key === '\x7f') {
        value = value.slice(0, -1)
        return
      }
      value += key
    }

    stdin.on('data', onData)
  })
}

async function recordAudit(event) {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME
  if (!uri || !dbName) return

  let client
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
    await client.connect()
    await client.db(dbName).collection('auth_audit_events').insertOne({
      ...event,
      created_at: new Date(),
    })
  } catch (error) {
    console.warn(`[audit] nao foi possivel registrar evento: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`)
  } finally {
    await client?.close().catch(() => undefined)
  }
}

async function main() {
  loadEnv('.env.local')
  loadEnv('.env')

  const email = String(process.argv[2] ?? '').trim().toLowerCase()
  let password = String(process.argv[3] ?? '')

  if (!email || !email.includes('@')) {
    console.error("Uso: node scripts/admin-reset-password.js <admin-email> ['NovaSenha@123']")
    process.exit(1)
  }

  if (!password) {
    password = await askHidden('Nova senha: ')
    const confirmation = await askHidden('Confirmar nova senha: ')
    if (password !== confirmation) {
      console.error('As senhas nao conferem.')
      process.exit(1)
    }
  }

  const passwordErrors = validateStrongPassword(password)
  if (passwordErrors.length > 0) {
    console.error(`Senha invalida: ${passwordErrors.join(' ')}`)
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.')
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('user_id, role, is_active, login_email')
    .eq('login_email', email)
    .eq('role', 'admin')
    .maybeSingle()

  if (profileError || !profile?.user_id || profile.role !== 'admin' || profile.is_active !== true) {
    await recordAudit({
      event: 'admin_password_reset',
      status: 'failure',
      identifier: email,
      reason: profileError?.message ?? 'admin_profile_not_found_or_inactive',
      source: 'script',
    })
    console.error('Admin ativo nao encontrado para esse e-mail.')
    process.exit(1)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.user_id, { password })
  if (updateError) {
    await recordAudit({
      event: 'admin_password_reset',
      status: 'failure',
      identifier: email,
      reason: updateError.message,
      source: 'script',
    })
    console.error(`Falha ao atualizar senha: ${updateError.message}`)
    process.exit(1)
  }

  await recordAudit({
    event: 'admin_password_reset',
    status: 'success',
    identifier: email,
    source: 'script',
  })

  console.log(`Senha atualizada com sucesso para ${maskEmail(email)}.`)
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
