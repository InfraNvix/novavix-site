#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <ssh_user@ssh_host> <dominio_principal> [dominio_www]"
  exit 1
fi

TARGET="$1"
DOMAIN="$2"
WWW_DOMAIN="${3:-www.$2}"

ssh "$TARGET" "bash -s" <<REMOTE
set -euo pipefail

sudo apt update
sudo apt -y upgrade
sudo timedatectl set-timezone America/Sao_Paulo

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git nginx ufw certbot python3-certbot-nginx
sudo npm i -g pm2

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

sudo mkdir -p /var/www/novavix-site/releases
sudo chown -R \$USER:\$USER /var/www/novavix-site

sudo tee /etc/nginx/sites-available/novavix-site >/dev/null <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN} ${WWW_DOMAIN};

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;

    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_cache_bypass \$http_upgrade;
  }
}
NGINX

sudo ln -sfn /etc/nginx/sites-available/novavix-site /etc/nginx/sites-enabled/novavix-site
sudo nginx -t
sudo systemctl reload nginx

echo "Bootstrap concluido. Proximo passo: configurar /var/www/novavix-site/shared.env, rodar deploy-release.sh e depois certbot --nginx."
REMOTE

echo "VPS preparada em ${TARGET}"
