#!/usr/bin/env bash
set -u

MODE="light"
if [[ "${1:-}" == "--full" ]]; then
  MODE="full"
elif [[ "${1:-}" == "--production" ]]; then
  MODE="production"
elif [[ -n "${1:-}" ]]; then
  echo "Uso: $0 [--full|--production]"
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

mkdir -p debug-logs
LOG_FILE="debug-logs/debug-novavix-$(date +%Y%m%d-%H%M%S)-${MODE}.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

CRITICAL=0
WARNINGS=0

ok() { printf '[OK] %s\n' "$1"; }
warn() { WARNINGS=$((WARNINGS + 1)); printf '[WARN] %s\n' "$1"; }
fail() { CRITICAL=$((CRITICAL + 1)); printf '[CRIT] %s\n' "$1"; }
info() { printf '[INFO] %s\n' "$1"; }
section() { printf '\n========== %s ==========\n' "$1"; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

run_or_fail() {
  local label="$1"
  shift
  if "$@"; then
    ok "${label}"
  else
    fail "${label}"
  fi
}

run_or_warn() {
  local label="$1"
  shift
  if "$@"; then
    ok "${label}"
  else
    warn "${label}"
  fi
}

check_file_exists() {
  local path="$1"
  if [[ -f "${path}" ]]; then
    ok "Arquivo encontrado: ${path}"
  else
    fail "Arquivo ausente: ${path}"
  fi
}

check_env_value_present() {
  local file="$1"
  local var="$2"
  local line value

  line="$(grep -E "^[[:space:]]*${var}[[:space:]]*=" "${file}" | tail -n1 || true)"
  if [[ -z "${line}" ]]; then
    return 1
  fi

  value="${line#*=}"
  value="$(printf '%s' "${value}" | sed -E 's/[[:space:]]+$//; s/^[[:space:]]+//')"
  if [[ -z "${value}" ]]; then
    return 1
  fi

  case "${value}" in
    PREENCHER|\"PREENCHER\"|\'PREENCHER\'|"")
      return 2
      ;;
  esac

  return 0
}

section "Contexto"
info "Modo: ${MODE}"
info "Projeto: ${ROOT_DIR}"
info "Log: ${LOG_FILE}"

section "Sistema e Recursos"
if [[ -f /etc/os-release ]]; then
  sed -n '1,12p' /etc/os-release
fi
uname -a || true
free -h || warn "Nao foi possivel coletar uso de RAM."
swapon --show || warn "Nao foi possivel coletar status de swap."
df -h || warn "Nao foi possivel coletar uso de disco."

section "Node e NPM"
run_or_fail "Node instalado" node -v
run_or_fail "NPM instalado" npm -v

section "Arquivos Base"
check_file_exists "package.json"
check_file_exists "next.config.mjs"
check_file_exists "ecosystem.config.cjs"
check_file_exists ".env.example"

section "Git"
run_or_warn "git status disponivel" git status --short --branch
run_or_warn "git diff --stat" git diff --stat
if git diff --check; then
  ok "git diff --check sem problemas"
else
  fail "git diff --check encontrou problemas"
fi

section "Scripts do package.json"
if has_cmd node; then
  node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts||{}).sort().join(', ') || '(sem scripts)')" || fail "Nao foi possivel ler scripts do package.json"
fi

section "Variaveis de Ambiente"
ENV_FILE=""
if [[ -f ".env" ]]; then
  ENV_FILE=".env"
  ok "Arquivo .env encontrado"
elif [[ -f "/var/www/novavix-site/shared.env" ]]; then
  ENV_FILE="/var/www/novavix-site/shared.env"
  ok "Arquivo shared.env encontrado em /var/www/novavix-site/shared.env"
else
  warn "Nenhum arquivo .env/shared.env encontrado"
fi

if [[ -n "${ENV_FILE}" ]]; then
  REQUIRED_VARS=(
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    MONGODB_URI
    MONGODB_DB_NAME
    RESEND_API_KEY
    EMAIL_FROM
    NEXT_PUBLIC_APP_URL
    FRONTEND_URL
    NOVAVIX_SYNC_API_KEY
    NOVAVIX_COPSOQ_API_KEY
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN
  )

  for var in "${REQUIRED_VARS[@]}"; do
    if check_env_value_present "${ENV_FILE}" "${var}"; then
      ok "Variavel preenchida: ${var}"
    else
      rc=$?
      if [[ ${rc} -eq 2 ]]; then
        warn "Variavel com placeholder: ${var}"
      else
        fail "Variavel ausente/vazia: ${var}"
      fi
    fi
  done
fi

section "Busca Basica por Secrets (sem exibir valores)"
if has_cmd node && has_cmd git; then
  SECRET_SCAN_OUTPUT="$(node <<'NODE'
const { execSync } = require('node:child_process');
const fs = require('node:fs');

function isSuspiciousValue(raw) {
  const v = String(raw || '').trim();
  if (!v) return false;
  if (/^(PREENCHER|YOUR_|CHANGEME|example|test|dummy)$/i.test(v)) return false;
  if (/^\$\{[A-Z0-9_]+\}$/.test(v)) return false;
  if (/^["']?\$\{[A-Z0-9_]+\}["']?$/.test(v)) return false;
  return true;
}

const keys = ['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'MONGODB_URI'];
const files = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const findings = [];

for (const file of files) {
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const key of keys) {
      const re = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`);
      const m = line.match(re);
      if (m && isSuspiciousValue(m[1])) {
        findings.push(`${file}:${idx + 1}:${key}`);
      }
    }

    if (line.includes('mongodb+srv://') && !line.includes('PREENCHER')) {
      findings.push(`${file}:${idx + 1}:mongodb+srv`);
    }
  });
}

if (findings.length > 0) {
  console.log(findings.join('\n'));
}
NODE
)"
  if [[ -n "${SECRET_SCAN_OUTPUT}" ]]; then
    fail "Possivel segredo em arquivo versionado. Revise os caminhos abaixo:"
    printf '%s\n' "${SECRET_SCAN_OUTPUT}"
  else
    ok "Nenhum secreto evidente detectado em arquivos versionados"
  fi
else
  warn "Node/git indisponivel para varredura de segredo"
fi

section "PM2 e Ecosystem"
if [[ -f "ecosystem.config.cjs" ]]; then
  ECOSYSTEM_CHECK="$(node <<'NODE'
const cfg = require('./ecosystem.config.cjs');
const app = (cfg.apps && cfg.apps[0]) || {};
const memory = String(app.max_memory_restart || '');
const num = Number.parseInt(memory, 10);
const unit = memory.replace(/[0-9]/g, '').trim().toUpperCase();
const result = {
  name: app.name || '',
  script: app.script || '',
  instances: app.instances,
  exec_mode: app.exec_mode || '',
  max_memory_restart: memory,
  memory_ok: Number.isFinite(num) && unit === 'M' && num >= 300 && num <= 350,
  has_cluster: String(app.exec_mode || '').toLowerCase() === 'cluster',
};
console.log(JSON.stringify(result));
NODE
)"
  info "ecosystem.config.cjs => ${ECOSYSTEM_CHECK}"

  if echo "${ECOSYSTEM_CHECK}" | rg -q '"instances":1'; then
    ok "PM2 instances = 1"
  else
    fail "PM2 instances diferente de 1"
  fi
  if echo "${ECOSYSTEM_CHECK}" | rg -q '"exec_mode":"fork"'; then
    ok "PM2 exec_mode = fork"
  else
    fail "PM2 exec_mode nao esta em fork"
  fi
  if echo "${ECOSYSTEM_CHECK}" | rg -q '"memory_ok":true'; then
    ok "max_memory_restart entre 300M e 350M"
  else
    fail "max_memory_restart fora da faixa 300M-350M"
  fi
  if echo "${ECOSYSTEM_CHECK}" | rg -q '"has_cluster":true'; then
    fail "Configuracao usa cluster (incompativel com VPS 512MB)"
  else
    ok "Sem modo cluster"
  fi
else
  fail "ecosystem.config.cjs ausente"
fi

if has_cmd pm2; then
  pm2 status || warn "pm2 status retornou erro"
  if pm2 status | rg -q "novavix-site"; then
    ok "Processo novavix-site encontrado no PM2"
    pm2 logs novavix-site --lines 40 --nostream || warn "Falha ao ler logs do PM2"
  else
    if [[ "${MODE}" == "production" ]]; then
      fail "Processo novavix-site nao encontrado no PM2 (modo production)"
    else
      warn "Processo novavix-site nao encontrado no PM2"
    fi
  fi
else
  if [[ "${MODE}" == "production" ]]; then
    fail "PM2 nao instalado (modo production)"
  else
    warn "PM2 nao instalado"
  fi
fi

section "Next Standalone"
if rg -n "output:[[:space:]]*['\"]standalone['\"]" next.config.mjs >/dev/null 2>&1; then
  ok "next.config.mjs com output standalone"
else
  fail "output standalone nao encontrado no next.config.mjs"
fi

if [[ "${MODE}" == "full" ]]; then
  section "Build Completo"
  run_or_fail "npm run lint" npm run lint
  run_or_fail "npx tsc --noEmit" npx tsc --noEmit
  run_or_fail "npm run build" npm run build
fi

if [[ -f ".next/standalone/server.js" ]]; then
  ok ".next/standalone/server.js encontrado"
else
  if [[ "${MODE}" == "full" ]]; then
    fail ".next/standalone/server.js ausente apos build"
  else
    warn ".next/standalone/server.js ausente (rode build para gerar)"
  fi
fi

section "Rede Local e Servicos"
if has_cmd ss; then
  if ss -ltn | rg -q ':3000[[:space:]]'; then
    ok "Porta 3000 em uso"
  else
    if [[ "${MODE}" == "production" ]]; then
      fail "Porta 3000 nao esta em uso (modo production)"
    else
      warn "Porta 3000 nao esta em uso"
    fi
  fi
elif has_cmd lsof; then
  if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    ok "Porta 3000 em uso"
  else
    if [[ "${MODE}" == "production" ]]; then
      fail "Porta 3000 nao esta em uso (modo production)"
    else
      warn "Porta 3000 nao esta em uso"
    fi
  fi
else
  warn "Nao foi possivel validar porta 3000 (ss/lsof indisponivel)"
fi

if has_cmd systemctl && systemctl list-unit-files | rg -q '^nginx\.service'; then
  NGINX_STATE="$(systemctl is-active nginx 2>/dev/null || true)"
  info "nginx status: ${NGINX_STATE:-unknown}"
  if [[ "${NGINX_STATE}" == "active" ]]; then
    ok "Nginx ativo"
  else
    if [[ "${MODE}" == "production" ]]; then
      fail "Nginx inativo no modo production"
    else
      warn "Nginx nao ativo"
    fi
  fi
else
  if [[ "${MODE}" == "production" ]]; then
    fail "Nginx nao instalado (modo production)"
  else
    warn "Nginx nao instalado"
  fi
fi

CURL_OUT="$(curl -sS -o /dev/null -m 8 -w '%{http_code} %{time_total}' http://127.0.0.1:3000 2>/dev/null || true)"
if [[ -z "${CURL_OUT}" ]]; then
  if [[ "${MODE}" == "production" ]]; then
    fail "curl local em 127.0.0.1:3000 falhou (modo production)"
  else
    warn "curl local em 127.0.0.1:3000 falhou"
  fi
else
  HTTP_CODE="${CURL_OUT%% *}"
  HTTP_TIME="${CURL_OUT##* }"
  info "curl 127.0.0.1:3000 => status=${HTTP_CODE} tempo=${HTTP_TIME}s"
  if [[ "${HTTP_CODE}" =~ ^5 ]]; then
    fail "curl local retornou erro 5xx"
  elif [[ "${HTTP_CODE}" == "000" ]]; then
    if [[ "${MODE}" == "production" ]]; then
      fail "curl local retornou status 000 (modo production)"
    else
      warn "curl local retornou status 000"
    fi
  else
    ok "curl local sem erro critico"
  fi
fi

section "Resumo"
printf 'Criticos: %s | Warnings: %s\n' "${CRITICAL}" "${WARNINGS}"
info "Log salvo em ${LOG_FILE}"

if [[ "${CRITICAL}" -gt 0 ]]; then
  exit 1
fi
exit 0

