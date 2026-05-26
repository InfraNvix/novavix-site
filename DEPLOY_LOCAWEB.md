# Go-live na Locaweb VPS (Linux) - Next.js 14

Este runbook e para deploy em VPS Linux (Ubuntu 22.04+) usando Nginx + PM2 + SSL.

> **VPS de 512 MB:** use o fluxo de artefatos em `docs/DEPLOY_VPS_512MB.md`. Nao execute `npm ci` ou `npm run build` na VPS pequena e nao use cluster PM2 nesse plano.

## 1) Premissas

- Projeto Next.js 14 com `output: standalone`
- PM2 conforme `ecosystem.config.cjs` (`fork`, 1 instancia para a configuracao de 512 MB)
- Nginx como reverse proxy para `127.0.0.1:3000`
- Certificado Let's Encrypt via Certbot

## 2) Provisionamento da VPS

```bash
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone America/Sao_Paulo

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git nginx ufw certbot python3-certbot-nginx

sudo npm i -g pm2
node -v
npm -v
pm2 -v
```

## 3) Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

## 4) Estrutura de deploy (releases)

```bash
sudo mkdir -p /var/www/novavix-site/releases
sudo chown -R $USER:$USER /var/www/novavix-site
cd /var/www/novavix-site
```

## 5) Variaveis de ambiente obrigatorias

Crie o arquivo de ambiente compartilhado:

```bash
cat > /var/www/novavix-site/shared.env <<'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=PREENCHER
NEXT_PUBLIC_SUPABASE_ANON_KEY=PREENCHER
SUPABASE_SERVICE_ROLE_KEY=PREENCHER
MONGODB_URI=PREENCHER
MONGODB_DB_NAME=PREENCHER
RESEND_API_KEY=PREENCHER
EMAIL_FROM=PREENCHER
NEXT_PUBLIC_APP_URL=https://PREENCHER
FRONTEND_URL=https://PREENCHER
NOVAVIX_SYNC_API_KEY=PREENCHER
NOVAVIX_COPSOQ_API_KEY=PREENCHER
NOVAVIX_COPSOQ_TECHNICAL_EMAILS=PREENCHER
NOVAVIX_COPSOQ_MIN_GROUP_RESPONDENTS=5
NOVAVIX_RATE_LIMIT_MAX_KEYS=10000
UPSTASH_REDIS_REST_URL=PREENCHER
UPSTASH_REDIS_REST_TOKEN=PREENCHER
FORM_EMAIL_INVITE_DEDUP_MINUTES=5
FORM_INVITE_DEDUP_WINDOW_MS=300000
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
ENVEOF
```

## 6) Deploy da aplicacao (somente VPS com memoria para build)

```bash
cd /var/www/novavix-site
RELEASE="$(date +%Y%m%d%H%M%S)"
mkdir -p "releases/$RELEASE"
cd "releases/$RELEASE"

# Opcao A: clone inicial
# git clone -b PREENCHER_BRANCH PREENCHER_REPO_URL .

# Opcao B: atualizar release via rsync/CI artifact

npm ci
set -a
. /var/www/novavix-site/shared.env
set +a
npm run build:prod
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/

ln -sfn "/var/www/novavix-site/releases/$RELEASE" /var/www/novavix-site/current
cd /var/www/novavix-site/current
```

## 7) PM2

```bash
cd /var/www/novavix-site/current
set -a
. /var/www/novavix-site/shared.env
set +a
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 startup systemd -u $USER --hp $HOME
```

Validacao de processo:

```bash
pm2 status
pm2 logs novavix-site --lines 100
curl -fsS http://127.0.0.1:3000/api/health/mongodb || true
```

## 8) Nginx

Crie `/etc/nginx/sites-available/novavix-site`:

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name PREENCHER_DOMINIO PREENCHER_WWW_DOMINIO;

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name PREENCHER_DOMINIO PREENCHER_WWW_DOMINIO;

  ssl_certificate /etc/letsencrypt/live/PREENCHER_DOMINIO/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/PREENCHER_DOMINIO/privkey.pem;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  ssl_protocols TLSv1.2 TLSv1.3;

  client_max_body_size 15m;
  keepalive_timeout 65;
  send_timeout 30;
  proxy_connect_timeout 5s;
  proxy_send_timeout 60s;
  proxy_read_timeout 60s;

  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_proxied any;
  gzip_comp_level 5;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_cache_bypass $http_upgrade;
  }
}
```

Ative o site:

```bash
sudo ln -sfn /etc/nginx/sites-available/novavix-site /etc/nginx/sites-enabled/novavix-site
sudo nginx -t
sudo systemctl reload nginx
```

## 9) SSL com Certbot

```bash
sudo certbot --nginx -d PREENCHER_DOMINIO -d PREENCHER_WWW_DOMINIO --redirect --agree-tos -m PREENCHER_EMAIL --no-eff-email
sudo systemctl status certbot.timer
```

Teste renovacao:

```bash
sudo certbot renew --dry-run
```

## 10) Logrotate basico para PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

## 11) Checklist tecnico de go-live

- `pm2 status` com `novavix-site` online (1 instancia na configuracao de 512 MB)
- `curl -I https://PREENCHER_DOMINIO` retorna `200`/`307` esperado
- `curl -I http://PREENCHER_DOMINIO` redireciona para HTTPS
- `curl -fsS https://PREENCHER_DOMINIO/api/health/mongodb`
- Login interno funcionando (`/login`)
- Dashboards carregam: `/dashboard`, `/dashboard/copsoq`, `/dashboard/analytics`
- Importacao de colaboradores funcionando
- Envio de convites por e-mail funcionando
- Validacao de convite funcionando
- Submissao de formulario por link sem login funcionando
- Registro de submissao no banco confirmado

## 12) Rollback rapido

```bash
cd /var/www/novavix-site
ls -1 releases
# escolher release anterior
ln -sfn /var/www/novavix-site/releases/PREENCHER_RELEASE_ANTERIOR /var/www/novavix-site/current
cd /var/www/novavix-site/current
set -a
. /var/www/novavix-site/shared.env
set +a
pm2 startOrReload ecosystem.config.cjs --update-env
```

Rollback de Nginx (se necessario):

```bash
sudo nginx -t && sudo systemctl reload nginx
```
