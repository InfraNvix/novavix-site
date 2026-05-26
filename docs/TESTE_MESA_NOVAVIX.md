# Teste de Mesa Novavix

Documento de validacao manual para o projeto `InfraNvix/novavix-site` antes de deploy em producao.

## Escopo

- Sem escrita real em banco para testes de diagnostico/smoke.
- Sem envio de e-mail real durante validacao automatizada.
- Foco em estabilidade operacional, seguranca basica e regressao funcional critica.

## Matriz de Validacao

### A. Ambiente e Deploy

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Build passa | `npm run build` | Build finaliza sem erro | [ ] |
| Standalone inicia | `npm run start:standalone` | Servidor sobe e responde localmente | [ ] |
| PM2 inicia | `pm2 startOrReload ecosystem.config.cjs --update-env` | Processo `novavix-site` online | [ ] |
| Nginx responde | `sudo nginx -t` e `systemctl status nginx` | Config valida e servico ativo | [ ] |
| HTTPS funciona | `curl -I https://DOMINIO` | `200`, `301` ou `307` | [ ] |
| HTTP redireciona | `curl -I http://DOMINIO` | Redireciona para HTTPS | [ ] |
| RAM estavel | `free -h` + monitoramento PM2 | Sem exaustao critica da RAM | [ ] |
| Swap ativo | `swapon --show` | Swap habilitado (recomendado 2 GB) | [ ] |

### B. Autenticacao

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Login valido | Entrar com usuario ativo | Sessao criada e redirect correto | [ ] |
| Login invalido | Senha incorreta/usuario invalido | Erro amigavel, sem stack trace | [ ] |
| Logout | Acionar logout em area protegida | Sessao encerrada e redirect para login/home | [ ] |
| Usuario nao autenticado | Acessar `/dashboard`, `/clinic`, `/portal` sem login | Redirect para login ou 401 controlado | [ ] |
| Usuario sem permissao | Usuario empresa em rota admin / usuario clinica em rota empresa | Redirect para area permitida | [ ] |
| Reset de senha | Fluxo completo de redefinicao | Token valido permite troca, invalido expira com mensagem amigavel | [ ] |

### C. Dashboard Empresa/Admin/Clinica

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Dashboard carrega | Acessar `/dashboard` autenticado | Tela renderiza sem branco/erro 500 | [ ] |
| Escopo empresa | Usuario empresa consulta dados | Ve apenas empresa vinculada | [ ] |
| Escopo clinica | Usuario clinica consulta dados | Ve apenas recursos permitidos | [ ] |
| Escopo admin | Usuario admin consulta dados | Ve modulos administrativos | [ ] |
| Rotas protegidas | Abrir rotas sem login | Nao devem abrir sem sessao valida | [ ] |

### D. Convites por E-mail

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Criar convite | Acionar endpoint de envio com payload valido | Convite persistido e retorno de sucesso | [ ] |
| Deduplicacao | Repetir envio na janela de dedup | Segundo envio bloqueado/ignorado conforme regra | [ ] |
| Resend configurado | Envio com `RESEND_API_KEY` e `EMAIL_FROM` validos | E-mail enviado sem erro operacional | [ ] |
| Falta de RESEND | Remover `RESEND_API_KEY` em ambiente de teste controlado | Erro amigavel sem vazar segredo | [ ] |
| URL do link | Conferir link de convite retornado/enviado | Usa `NEXT_PUBLIC_APP_URL` ou URL base esperada | [ ] |

### E. Formularios

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Link sem login | Abrir link publico de formulario | Formulario carrega | [ ] |
| Token invalido | Abrir convite com token invalido | Rejeitado com erro amigavel | [ ] |
| Token expirado | Simular convite expirado | Rejeitado com erro amigavel | [ ] |
| Submissao valida | Enviar formulario valido | Registro criado sem erro 500 | [ ] |
| Submissao duplicada | Repetir consumo do mesmo convite | Bloqueio/tratamento correto | [ ] |
| Erro de banco | Simular indisponibilidade controlada | Mensagem amigavel sem stack trace | [ ] |

### F. Importacao

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Preview funciona | Upload valido em `/api/imports/preview` | Preview retornado com resumo | [ ] |
| Arquivo invalido | Upload com formato invalido | Rejeicao com erro de validacao | [ ] |
| Colunas ausentes | Arquivo sem campos obrigatorios | Avisos/erros de mapeamento | [ ] |
| Duplicados | Arquivo com duplicidade | Tratamento conforme estrategia de import | [ ] |
| Planilha vazia | Upload vazio | Erro amigavel, sem quebrar runtime | [ ] |

### G. Integracoes Externas

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Supabase | Fluxo autenticacao e leitura basica | Conexao operacional | [ ] |
| MongoDB | `GET /api/health/mongodb` com envs corretas | Status de conectividade OK | [ ] |
| Upstash | Validar endpoint com rate limit | Limitador responde sem erro interno | [ ] |
| Sanity | Acessar area/admin ou conteudo relacionado | Sem quebra em paginas publicas | [ ] |
| Resend | Simular envio de convite em ambiente de homologacao | Sem vazamento de erro sensivel | [ ] |

### H. Seguranca

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Secrets no bundle | Revisar uso de `NEXT_PUBLIC_*` e build output | Sem segredo privado exposto no cliente | [ ] |
| Prefixos corretos | Revisar `.env.example` e codigo | Variaveis privadas sem `NEXT_PUBLIC_` | [ ] |
| Vazamento de dados | Testar rotas privadas sem auth | Sem dados sensiveis em resposta | [ ] |
| Stack trace em prod | Forcar erro controlado em producao | Sem stack trace em resposta HTTP | [ ] |
| Rate limit | Validar endpoints sensiveis | Bloqueio funcional sob carga curta | [ ] |
| CORS | Revisar headers de API | Sem origem aberta indevidamente | [ ] |

### I. Regressao Visual Basica

| Cenário | Como validar | Resultado esperado | Status |
|---|---|---|---|
| Home | Abrir `/` desktop/mobile | Renderiza sem tela branca | [ ] |
| Login | Abrir `/login` | Renderiza e aceita fluxo de auth | [ ] |
| Portal | Abrir `/portal` | Renderiza/redirect esperado | [ ] |
| Dashboard | Abrir `/dashboard` autenticado | Sem tela branca e sem erro de hidracao | [ ] |
| Mobile basico | Testar viewport mobile das telas criticas | Sem quebra estrutural severa | [ ] |

### J. Criterios de Aprovacao

| Critério | Evidência | Status |
|---|---|---|
| Sem erro 500 nos fluxos principais | Smoke + teste de mesa | [ ] |
| Build passa | `npm run build` | [ ] |
| Typecheck passa | `npx tsc --noEmit` | [ ] |
| Lint passa ou apenas warnings aceitaveis | `npm run lint` | [ ] |
| PM2 estavel por 10 min | `pm2 status` + logs | [ ] |
| RAM dentro do aceitavel para 512 MB | `free -h` + monitoramento PM2 | [ ] |
| Logs sem erro critico repetitivo | `pm2 logs novavix-site` | [ ] |

## Observacao sobre Healthchecks

No estado atual do repositório existe `GET /api/health/mongodb` em
`app/api/health/mongodb/route.ts`. Rotas adicionais (`/api/health`,
`/api/health/supabase`, `/api/health/redis`) podem ser adicionadas depois em uma
tarefa dedicada, sem misturar com este ciclo de estabilizacao.

