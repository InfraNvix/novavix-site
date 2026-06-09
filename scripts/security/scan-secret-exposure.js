#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const projectRoot = path.resolve(__dirname, '..', '..')
const envPath = path.join(projectRoot, '.env')

const SENSITIVE_ENV_NAMES = new Set([
  'SUPABASE_SERVICE_ROLE_KEY',
  'MONGODB_URI',
  'RESEND_API_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'NOVAVIX_SYNC_API_KEY',
  'NOVAVIX_COPSOQ_API_KEY',
  'GMAIL_APP_PASSWORD',
])

const FORBIDDEN_ARTIFACT_PATHS = [
  '.env.bak',
  '.next/standalone/.env',
  'release-artifact/.next/standalone/.env',
]

const SKIP_DIRS = new Set(['.git', 'node_modules'])
const SKIP_PREFIXES = ['.next/cache/']
const SKIP_FILES = new Set(['.env', 'package-lock.json'])
const STORAGE_WRITE_ALLOWLIST = new Set([
  'lib/security/browser-storage.ts',
  'scripts/security/scan-secret-exposure.js',
])
const BROWSER_STORAGE_WRITE_PATTERN = /\b(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\s*\.\s*(?:setItem|clear)\s*\(/

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return []

  const entries = []
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match || !SENSITIVE_ENV_NAMES.has(match[1])) continue

    const value = match[2].trim().replace(/^['"]|['"]$/g, '')
    if (value.length >= 12) entries.push({ name: match[1], value })
  }
  return entries
}

function shouldSkip(relativePath) {
  if (SKIP_FILES.has(relativePath)) return true
  return SKIP_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
}

function walkFiles(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(projectRoot, fullPath)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(relativePath) || SKIP_DIRS.has(entry.name)) continue
      walkFiles(fullPath, onFile)
      continue
    }

    if (entry.isFile() && !shouldSkip(relativePath)) {
      onFile(fullPath, relativePath)
    }
  }
}

function listTarEntries(tarPath) {
  try {
    return execFileSync('tar', ['-tzf', tarPath], { cwd: projectRoot, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
  } catch {
    return []
  }
}

const findings = []

for (const relativePath of FORBIDDEN_ARTIFACT_PATHS) {
  if (fs.existsSync(path.join(projectRoot, relativePath))) {
    findings.push(`${relativePath}: arquivo de ambiente nao pode existir em artefato/build`)
  }
}

const secrets = parseEnvFile(envPath)
if (secrets.length > 0) {
  walkFiles(projectRoot, (filePath, relativePath) => {
    if (relativePath.endsWith('.tgz')) {
      const entries = listTarEntries(filePath)
      const envEntry = entries.find((entry) => entry === '.env' || entry.endsWith('/.env') || entry.includes('/.env.'))
      if (envEntry) findings.push(`${relativePath}: pacote contem arquivo de ambiente (${envEntry})`)
      return
    }

    let content = ''
    try {
      content = fs.readFileSync(filePath, 'utf8')
    } catch {
      return
    }

    for (const secret of secrets) {
      if (content.includes(secret.value)) {
        findings.push(`${relativePath}: contem valor privado de ${secret.name}`)
      }
    }

    if (
      !relativePath.startsWith('.next/') &&
      !STORAGE_WRITE_ALLOWLIST.has(relativePath) &&
      BROWSER_STORAGE_WRITE_PATTERN.test(content)
    ) {
      findings.push(`${relativePath}: escrita direta em localStorage/sessionStorage nao permitida`)
    }
  })
}

if (findings.length > 0) {
  console.error('[security] secret exposure detected:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('[security] no private secret exposure detected outside .env')
