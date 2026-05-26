#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

CRITICAL=0
TIMEOUTS=0

ok_count=0
warn_count=0
fail_count=0

contains_code() {
  local code="$1"
  shift
  for allowed in "$@"; do
    if [[ "${allowed}" == "${code}" ]]; then
      return 0
    fi
  done
  return 1
}

print_row() {
  printf '%-30s %-8s %-10s %-12s\n' "$1" "$2" "$3" "$4"
}

run_http_check() {
  local route="$1"
  local profile="$2"
  local url="${BASE_URL}${route}"
  local result status_code total_time curl_exit
  local accepted_public=(200 301 307)
  local accepted_protected=(200 302 303 307 401)
  local outcome="PASS"

  result="$(curl -sS -L -o /dev/null --max-time 10 --connect-timeout 3 -w '%{http_code} %{time_total}' "${url}" 2>/dev/null)"
  curl_exit=$?

  if [[ ${curl_exit} -ne 0 ]]; then
    outcome="TIMEOUT"
    status_code="000"
    total_time="-"
    CRITICAL=$((CRITICAL + 1))
    TIMEOUTS=$((TIMEOUTS + 1))
    fail_count=$((fail_count + 1))
    print_row "${route}" "${status_code}" "${total_time}" "${outcome}"
    return
  fi

  status_code="${result%% *}"
  total_time="${result##* }"

  if [[ "${status_code}" =~ ^5 ]]; then
    outcome="CRITICAL"
    CRITICAL=$((CRITICAL + 1))
    fail_count=$((fail_count + 1))
  else
    if [[ "${profile}" == "public" ]]; then
      if contains_code "${status_code}" "${accepted_public[@]}"; then
        outcome="PASS"
        ok_count=$((ok_count + 1))
      else
        outcome="FAIL"
        fail_count=$((fail_count + 1))
        CRITICAL=$((CRITICAL + 1))
      fi
    elif [[ "${profile}" == "protected" ]]; then
      if contains_code "${status_code}" "${accepted_protected[@]}"; then
        outcome="PASS"
        ok_count=$((ok_count + 1))
      else
        outcome="FAIL"
        fail_count=$((fail_count + 1))
        CRITICAL=$((CRITICAL + 1))
      fi
    else
      # health: falha critica somente para 5xx e timeout; demais resultados sao informativos
      outcome="PASS"
      ok_count=$((ok_count + 1))
      if [[ "${status_code}" == "404" ]]; then
        outcome="WARN"
        warn_count=$((warn_count + 1))
      fi
    fi
  fi

  print_row "${route}" "${status_code}" "${total_time}s" "${outcome}"
}

run_health_check() {
  local route="$1"
  local file="$2"
  if [[ ! -f "${file}" ]]; then
    print_row "${route}" "-" "-" "NA"
    return
  fi
  run_http_check "${route}" "health"
}

echo "Smoke Novavix"
echo "BASE_URL=${BASE_URL}"
echo
print_row "Rota" "Status" "Tempo" "Resultado"
print_row "------------------------------" "--------" "----------" "------------"

run_http_check "/" "public"
run_http_check "/login" "public"
run_http_check "/auth/reset-password" "public"

run_http_check "/portal" "protected"
run_http_check "/clinic" "protected"
run_http_check "/dashboard" "protected"

run_health_check "/api/health" "app/api/health/route.ts"
run_health_check "/api/health/mongodb" "app/api/health/mongodb/route.ts"
run_health_check "/api/health/supabase" "app/api/health/supabase/route.ts"
run_health_check "/api/health/redis" "app/api/health/redis/route.ts"

echo
echo "Resumo: pass=${ok_count} warn=${warn_count} fail=${fail_count} timeout=${TIMEOUTS}"

if [[ "${CRITICAL}" -gt 0 ]]; then
  exit 1
fi
exit 0

