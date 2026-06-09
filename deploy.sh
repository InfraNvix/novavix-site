#!/usr/bin/env bash
set -euo pipefail

TARGET="${DEPLOY_TARGET:-root@200.234.218.144}"
APP_ROOT="${DEPLOY_APP_ROOT:-/var/www/novavix}"
APP_NAME="${DEPLOY_APP_NAME:-novavix-site}"
ARTIFACT="novavix-standalone.tgz"

echo "Gerando build local..."
npm run build

echo "Preparando artefato standalone..."
rm -rf release-artifact "$ARTIFACT"
mkdir -p release-artifact/.next/standalone/.next

cp -a .next/standalone/. release-artifact/.next/standalone/
npm run security:scrub-build
cp -a .next/static release-artifact/.next/standalone/.next/static
cp -a public release-artifact/.next/standalone/public
cp -a ecosystem.config.cjs release-artifact/ecosystem.config.cjs
mkdir -p release-artifact/scripts
cp -a scripts/admin-reset-password.js release-artifact/scripts/admin-reset-password.js

tar -czf "$ARTIFACT" -C release-artifact .

echo "Enviando artefato para VPS ${TARGET}..."
scp "$ARTIFACT" "${TARGET}:/tmp/${ARTIFACT}"

echo "Atualizando VPS..."
ssh "$TARGET" "bash -s" <<EOF
set -euo pipefail

APP_ROOT="${APP_ROOT}"
APP_NAME="${APP_NAME}"
ARTIFACT="/tmp/${ARTIFACT}"
RELEASE="\$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="\${APP_ROOT}/releases/\${RELEASE}"
SHARED_ENV="\${APP_ROOT}/shared.env"
LEGACY_ENV="\${APP_ROOT}/.env"

if [[ -f "\${SHARED_ENV}" ]]; then
  ENV_FILE="\${SHARED_ENV}"
elif [[ -f "\${LEGACY_ENV}" ]]; then
  ENV_FILE="\${LEGACY_ENV}"
else
  echo "ERRO: nenhum arquivo de ambiente encontrado em \${SHARED_ENV} ou \${LEGACY_ENV}."
  exit 1
fi

mkdir -p "\${APP_ROOT}/releases"
mkdir -p "\${RELEASE_DIR}"
tar -xzf "\${ARTIFACT}" -C "\${RELEASE_DIR}"

ln -sfn "\${RELEASE_DIR}" "\${APP_ROOT}/current"
cd "\${APP_ROOT}/current"

set -a
. "\${ENV_FILE}"
set +a

pm2 delete "\${APP_NAME}" || true
pm2 start ecosystem.config.cjs --update-env
pm2 save

if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx || true
fi

echo "Release \${RELEASE} ativo."
curl -fsS http://127.0.0.1:\${PORT:-3000}/api/health/mongodb || true
pm2 status "\${APP_NAME}" || pm2 status
EOF

echo "Deploy finalizado."
