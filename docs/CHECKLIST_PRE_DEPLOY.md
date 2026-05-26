# Checklist Pre-Deploy Novavix

Checklist objetivo antes de subir para producao, com foco em estabilidade para VPS pequena.

## 1. Validacao local (aplicacao)

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run start:standalone
./scripts/debug-novavix.sh
./scripts/debug-novavix.sh --full
BASE_URL=http://127.0.0.1:3000 ./scripts/smoke-novavix.sh
```

## 2. Validacao de VPS

```bash
free -h
df -h
pm2 status
pm2 logs novavix-site --lines 100
sudo nginx -t
curl -I http://127.0.0.1:3000
curl -I https://DOMINIO
```

## 3. Itens de aprovacao

- [ ] Build e typecheck sem erro.
- [ ] Sem erro `500` nas rotas principais de smoke.
- [ ] `ecosystem.config.cjs` em `fork` com `instances: 1`.
- [ ] `max_memory_restart` adequado para VPS 512 MB.
- [ ] Swap ativo no servidor.
- [ ] Logs PM2 sem erro critico recorrente.
- [ ] Nenhum segredo real em arquivo versionado.
- [ ] Integracoes externas validadas em ambiente de homologacao.

## 4. Nota de seguranca

Durante debug e smoke:
- nao enviar e-mails reais;
- nao executar operacoes de escrita em banco de producao;
- nao expor valores de variaveis sensiveis nos logs.

