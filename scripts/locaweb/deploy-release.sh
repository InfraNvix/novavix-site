#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Uso: $0 <ssh_user@ssh_host> <repo_url> <branch>"
  exit 1
fi

TARGET="$1"
REPO_URL="$2"
BRANCH="$3"

ssh "$TARGET" "bash -s" <<REMOTE
set -euo pipefail

cd /var/www/novavix-site
RELEASE="\$(date +%Y%m%d%H%M%S)"
mkdir -p "releases/\$RELEASE"
cd "releases/\$RELEASE"

git clone -b ${BRANCH} ${REPO_URL} .

npm ci
set -a
. /var/www/novavix-site/shared.env
set +a
npm run build:prod

mkdir -p .next/standalone/.next
npm run security:scrub-build
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/

ln -sfn "/var/www/novavix-site/releases/\$RELEASE" /var/www/novavix-site/current
cd /var/www/novavix-site/current

set -a
. /var/www/novavix-site/shared.env
set +a
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "Release \$RELEASE ativo"
curl -fsS http://127.0.0.1:3000/api/health/mongodb || true
pm2 status
REMOTE

echo "Deploy finalizado em ${TARGET}"
