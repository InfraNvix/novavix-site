# Deploy em VPS Linux com 512 MB

Este fluxo executa apenas o servidor Next.js standalone na VPS. O build deve ser
gerado fora da maquina pequena, em uma estacao local ou em CI com Node.js 20+.

## Limites operacionais

- Use Nginx como reverse proxy e PM2 em `fork` com uma instancia.
- Ative 2 GB de swap antes de iniciar a aplicacao.
- Use MongoDB, Supabase, Upstash e Resend como servicos externos.
- Nao rode Docker, MongoDB local, cluster PM2, `npm ci` ou `npm run build` na VPS de 512 MB.
- Importacoes grandes (`xlsx`) podem pressionar a memoria mesmo com um unico processo; valide o tamanho real dos arquivos antes do go-live.

## Variaveis de ambiente

Parta de `.env.example`. Variaveis `NEXT_PUBLIC_*` sao publicadas no bundle do
navegador; nunca coloque chaves privadas nelas. Em producao, o middleware
valida as configuracoes obrigatorias e informa os nomes ausentes.

Obrigatorias para os fluxos atuais:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO
SUPABASE_SERVICE_ROLE_KEY=
MONGODB_URI=
MONGODB_DB_NAME=
RESEND_API_KEY=
EMAIL_FROM=
FRONTEND_URL=https://SEU_DOMINIO
NOVAVIX_SYNC_API_KEY=
NOVAVIX_COPSOQ_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

O envio de convites implementado utiliza Resend. Configuracoes SMTP presentes
no exemplo nao substituem `RESEND_API_KEY`.

## Build fora da VPS

Execute em CI ou na maquina de build. Defina as variaveis `NEXT_PUBLIC_*` de
producao antes do build, pois seus valores sao incorporados aos arquivos do
navegador; secrets privados permanecem apenas na VPS.

```bash
npm ci
npm run lint
npm run typecheck
npm audit --omit=dev --audit-level=high
npm run build:prod

mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/

rm -rf release-artifact
mkdir -p release-artifact/.next
cp -a .next/standalone release-artifact/.next/
cp ecosystem.config.cjs release-artifact/
tar -czf novavix-standalone.tgz -C release-artifact .
```

O pacote enviado para a VPS contem somente o runtime standalone, arquivos
estaticos, conteudo publico e a configuracao PM2. Nao envie `.env` no artefato.
Nao publique enquanto a auditoria reportar vulnerabilidades altas sem uma
avaliacao documentada de impacto e mitigacao.

## Preparacao unica da VPS

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2
node --version

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h

mkdir -p /var/www/novavix-site/releases
```

Mantenha Nginx encaminhando HTTPS para `http://127.0.0.1:3000`, conforme a
configuracao do runbook `DEPLOY_LOCAWEB.md`. Para esta VPS, use no bloco
`server` um limite compativel com as rotas de upload:

```nginx
client_max_body_size 6m;
```

A aplicacao rejeita preview/importacao de arquivos acima de 5 MB; a folga no
Nginx cobre o envelope `multipart/form-data`.

## Teste do standalone antes do envio

Na maquina de build, com as variaveis de runtime carregadas e depois de montar
o standalone conforme a sequencia acima:

```bash
npm run start:standalone
curl -fsS http://127.0.0.1:3000/
curl -fsS http://127.0.0.1:3000/api/health/mongodb
```

Encerre o servidor de teste apos a verificacao e publique somente o artefato.

## Publicacao do artefato

Envie `novavix-standalone.tgz` para a VPS e mantenha secrets apenas no host:

```bash
cd /var/www/novavix-site
RELEASE="$(date +%Y%m%d%H%M%S)"
mkdir -p "releases/$RELEASE"
tar -xzf /tmp/novavix-standalone.tgz -C "releases/$RELEASE"

# Crie este arquivo uma unica vez, com valores shell-safe e permissao restrita.
chmod 600 /var/www/novavix-site/shared.env

ln -sfn "/var/www/novavix-site/releases/$RELEASE" current
cd current
set -a
. /var/www/novavix-site/shared.env
set +a
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

O carregamento de `shared.env` antes do `pm2 ... --update-env` garante que o
processo standalone receba variaveis privadas sem incorpora-las no artefato.

## Checklist pos-deploy

```bash
pm2 status
pm2 logs novavix-site --lines 100
free -h
curl -fsS http://127.0.0.1:3000/
curl -fsS http://127.0.0.1:3000/api/health/mongodb
curl -I https://SEU_DOMINIO
```

Valide manualmente:

- login e recuperacao de senha;
- `/dashboard`, analytics e COPSOQ com usuario autorizado;
- criacao/listagem de formularios e importacao com arquivo pequeno;
- envio Resend, abertura e consumo unico de convite;
- submissao de formulario e persistencia no MongoDB/Supabase;
- logs PM2 sem reinicios por memoria apos o teste.

## Rollback

```bash
cd /var/www/novavix-site
ln -sfn "/var/www/novavix-site/releases/RELEASE_ANTERIOR" current
cd current
set -a
. /var/www/novavix-site/shared.env
set +a
pm2 startOrReload ecosystem.config.cjs --update-env
```
