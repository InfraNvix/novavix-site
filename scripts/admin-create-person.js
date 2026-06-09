#!/usr/bin/env node

const fs = require('node:fs')
const readline = require('node:readline')
const { randomUUID } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const { MongoClient } = require('mongodb')

const PASSWORD_MIN_LENGTH = 10
const USER_ROLES = new Set(['admin', 'empresa', 'clinica'])

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

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue

    const key = item.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = value
    index += 1
  }
  return args
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCnpj(value) {
  return asString(value).replace(/\D/g, '')
}

function isValidCnpjFormat(value) {
  return /^\d{14}$/.test(value)
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

function usage() {
  console.error(`
Uso:
  npm run admin:create-person -- --role admin --email admin@novavix.com.br
  npm run admin:create-person -- --role clinica --email clinica@exemplo.com
  npm run admin:create-person -- --role empresa --email empresa@exemplo.com --cnpj 00000000000000 --razao-social "Empresa LTDA" [--nome-fantasia "Empresa"]

Observacoes:
  - A senha e sempre solicitada em prompt oculto.
  - Nao passe senha por argumento para evitar historico do shell.
  - Requer NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MONGODB_URI e MONGODB_DB_NAME.
`)
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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function withMongo(callback) {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME
  if (!uri || !dbName) {
    throw new Error('Variaveis MONGODB_URI e MONGODB_DB_NAME sao obrigatorias.')
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    return await callback(client.db(dbName))
  } finally {
    await client.close().catch(() => undefined)
  }
}

async function recordAudit(db, event) {
  try {
    await db.collection('auth_audit_events').insertOne({
      ...event,
      created_at: new Date(),
    })
  } catch (error) {
    console.warn(`[audit] nao foi possivel registrar evento: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`)
  }
}

async function upsertCompanyMongo(db, company) {
  await db.collection('companies').updateOne(
    { supabase_id: company.id },
    {
      $set: {
        supabase_id: company.id,
        cnpj: company.cnpj,
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia,
        status: company.status,
        created_at: company.created_at,
        updated_at: company.updated_at,
        mirrored_at: new Date().toISOString(),
      },
    },
    { upsert: true }
  )
}

async function upsertUserProfileMongo(db, profile) {
  await db.collection('user_profiles').updateOne(
    { supabase_id: profile.user_id },
    {
      $set: {
        supabase_id: profile.user_id,
        user_id: profile.user_id,
        role: profile.role,
        company_id: profile.company_id,
        login_email: profile.login_email,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        mirrored_at: new Date().toISOString(),
      },
    },
    { upsert: true }
  )
}

async function main() {
  loadEnv('.env.local')
  loadEnv('.env')

  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    usage()
    return
  }

  const role = asString(args.role).toLowerCase()
  const email = asString(args.email).toLowerCase()
  const cnpj = normalizeCnpj(args.cnpj)
  const razaoSocial = asString(args['razao-social'])
  const nomeFantasia = asString(args['nome-fantasia'])

  const errors = []
  if (!USER_ROLES.has(role)) errors.push('role deve ser admin, empresa ou clinica.')
  if (!email || !email.includes('@')) errors.push('email invalido.')
  if (role === 'empresa' && !isValidCnpjFormat(cnpj)) errors.push('empresa exige cnpj com 14 digitos.')
  if (role === 'empresa' && razaoSocial.length < 3) errors.push('empresa exige razao-social com ao menos 3 caracteres.')
  if (role !== 'empresa' && (cnpj || razaoSocial || nomeFantasia)) errors.push('cnpj/razao-social/nome-fantasia sao aceitos apenas para role empresa.')

  if (errors.length > 0) {
    console.error(`Dados invalidos: ${errors.join(' ')}`)
    usage()
    process.exit(1)
  }

  const password = await askHidden('Senha inicial: ')
  const confirmation = await askHidden('Confirmar senha inicial: ')
  if (password !== confirmation) {
    console.error('As senhas nao conferem.')
    process.exit(1)
  }

  const passwordErrors = validateStrongPassword(password)
  if (passwordErrors.length > 0) {
    console.error(`Senha invalida: ${passwordErrors.join(' ')}`)
    process.exit(1)
  }

  const admin = getSupabaseAdmin()
  await withMongo(async (db) => {
    const { data: existingProfile, error: profileLookupError } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('login_email', email)
      .maybeSingle()

    if (profileLookupError) throw new Error(`Falha ao consultar perfil existente: ${profileLookupError.message}`)
    if (existingProfile?.user_id) throw new Error('E-mail de login ja esta em uso.')

    let company = null
    if (role === 'empresa') {
      const { data: existingCompany, error: companyLookupError } = await admin
        .from('companies')
        .select('id')
        .eq('cnpj', cnpj)
        .maybeSingle()

      if (companyLookupError) throw new Error(`Falha ao consultar empresa existente: ${companyLookupError.message}`)
      if (existingCompany?.id) throw new Error('Ja existe empresa com este CNPJ.')

      const now = new Date().toISOString()
      company = {
        id: randomUUID(),
        cnpj,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        status: 'active',
        created_at: now,
        updated_at: now,
      }

      const { error: companyError } = await admin.from('companies').insert(company)
      if (companyError) throw new Error(`Falha ao criar empresa: ${companyError.message}`)
      await upsertCompanyMongo(db, company)
    }

    const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        provider: 'email',
      },
      user_metadata: {
        role,
        company_id: company?.id ?? null,
      },
    })

    if (userError || !createdUser?.user?.id) {
      throw new Error(`Falha ao criar usuario autenticado: ${userError?.message ?? 'UNKNOWN_ERROR'}`)
    }

    const now = new Date().toISOString()
    const profile = {
      user_id: createdUser.user.id,
      role,
      company_id: company?.id ?? null,
      login_email: email,
      is_active: true,
      created_at: now,
      updated_at: now,
    }

    const { error: profileError } = await admin.from('user_profiles').insert(profile)
    if (profileError) {
      await admin.auth.admin.deleteUser(createdUser.user.id).catch(() => undefined)
      throw new Error(`Falha ao criar perfil: ${profileError.message}`)
    }

    await upsertUserProfileMongo(db, profile)
    await recordAudit(db, {
      event: 'admin_create_person',
      status: 'success',
      identifier: email,
      role,
      company_id: company?.id ?? null,
      source: 'script',
    })

    console.log(`Pessoa criada com sucesso: ${maskEmail(email)} (${role}).`)
    if (company) {
      console.log(`Empresa vinculada: ${company.razao_social} (${company.cnpj}).`)
    }
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
