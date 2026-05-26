# Relatório de Segurança (Simulação Defensiva) — Novavix GO

Data: 2026-05-26  
Escopo: revisão estática de código + simulação conceitual controlada (sem ataques reais, sem envio de e-mail real, sem escrita deliberada em base real).  
Status do relatório: **defensivo/autorizado**.

## 1) Visão geral do sistema

### Stack observada
- Next.js 14 (App Router, `output: 'standalone'`) — [`next.config.mjs`](../next.config.mjs)
- Supabase (auth, dados operacionais e admin client) — [`lib/supabase/*`](../lib/supabase)
- MongoDB Atlas (mirror/cache primário de leitura/escrita) — [`lib/mongodb/*`](../lib/mongodb)
- Resend (envio de convites por e-mail) — [`lib/email/send-form-invite.ts`](../lib/email/send-form-invite.ts)
- Upstash Redis/RateLimit — [`lib/security/rate-limit.ts`](../lib/security/rate-limit.ts)
- Sanity Studio/Admin — [`app/admin/[[...index]]/page.tsx`](../app/admin/[[...index]]/page.tsx)

### Fluxos principais
- Login empresa/admin/clínica (`/login` + `/api/auth/company-login`)
- Áreas autenticadas: `/dashboard`, `/clinic`, `/admin`, `/portal`
- Formulários por template + convite/token:
  - leitura de template
  - validação de token
  - submissão
  - envio de convites
- Importação de planilhas (preview + commit)
- Analytics/COPSOQ com escopo por empresa e trilha de auditoria

### Áreas públicas e autenticadas
- Públicas: `/`, `/login`, `/formularios/[templateId]`, `/portal/[token]`, APIs públicas de formulário/convite.
- Autenticadas: `/dashboard*`, `/clinic*`, `/admin*`, `/portal` (sem token), APIs administrativas/COPSOQ/importação/sync.

### Ativos críticos a proteger
- Dados de empresas e colaboradores (multi-tenant)
- Respostas de formulários e perfis COPSOQ
- Tokens de convite e fluxo de reset
- Chaves privadas (`SUPABASE_SERVICE_ROLE_KEY`, `MONGODB_URI`, `RESEND_API_KEY`, `UPSTASH_*`, API keys internas)
- Áreas administrativas e integrações externas

---

## 2) Mapa de superfície de ataque

| Item | Arquivo(s) | Função | Risco principal | Exposição |
|---|---|---|---|---|
| Páginas públicas | `app/page.tsx`, `app/login/page.tsx`, `app/formularios/[templateId]/page.tsx`, `app/portal/[token]/page.tsx` | Entrada do usuário e fluxo de convite | Enumeração/abuso de endpoints públicos | Médio |
| Páginas protegidas | `middleware.ts`, `lib/auth/guards.ts`, `app/dashboard/*`, `app/clinic/page.tsx`, `app/admin/[[...index]]/page.tsx` | Gate de sessão/role | Bypass por inconsistência UI/API | Médio |
| APIs públicas de formulário | `app/api/forms/[templateId]/route.ts`, `.../html/route.ts`, `.../collaborators/route.ts`, `.../invites/validate/route.ts`, `.../[templateId]/submit/route.ts` | Template, colaboradores, validação de convite, submissão | IDOR/enumeração/abuso de token | Alto |
| APIs autenticadas/admin | `app/api/admin/*`, `app/api/imports/*`, `app/api/copsoq/*`, `app/api/analytics/*` | Operações críticas | Escalada de privilégio e escopo | Alto |
| Rotas com token | `app/portal/[token]/ui.tsx`, `app/api/forms/invites/validate/route.ts`, `app/api/forms/[templateId]/submit/route.ts` | Validação e consumo de convite | Reuso/força bruta/expiração | Alto |
| Upload/importação | `app/api/imports/preview/route.ts`, `app/api/admin/forms/upload/route.ts`, parsers em `lib/imports/parsers/*` | Upload e parsing de arquivo | DoS por payload, dados malformados, CSV formula risk | Médio |
| Envio de e-mail | `app/api/forms/invites/send/route.ts`, `app/api/admin/form-email-invites/send/route.ts`, `lib/email/send-form-invite.ts` | Convites por e-mail | Vazamento de erro, abuso de envio | Médio |
| MongoDB | `lib/mongodb/*`, várias APIs de forms/admin | Persistência/mirror | Leitura cruzada e consistência de tenant | Alto |
| Supabase | `lib/supabase/*`, APIs admin/forms/copsoq | Auth e dados principais | Bypass de escopo se role/contexto falhar | Alto |
| Rate limit | `lib/security/rate-limit.ts`, uso em várias APIs | Anti-abuso | Falha de disponibilidade em prod sem Redis | Médio |
| Variáveis `NEXT_PUBLIC_*` | `.env.example`, `lib/supabase/browser.ts`, rotas de convite | Config pública de cliente | Exposição indevida se segredo usar prefixo | Baixo (sem evidência de segredo) |
| Variáveis privadas | `.env.example`, `lib/env/required.ts`, `lib/supabase/admin.ts` | Segredos e chaves | Vazamento por erro/log se mal tratado | Médio |

Observação: o middleware aplica headers/CORS no matcher configurado (`/api/*`, `/login`, `/dashboard/*`, `/portal/*`, `/admin/*`, `/clinic/*`). Rotas públicas fora disso (ex.: `/`) não recebem esse conjunto customizado.

---

## 3) Simulações defensivas de ataques (controladas)

Formato: cenário, caminho provável, impacto, evidência, severidade/probabilidade, mitigação, teste seguro e critério.

### A. Broken Access Control / IDOR
- Objetivo: acessar dados de outra empresa alterando `companyId/sessionId/token`.
- Evidência: `canAccessCompanyScope` libera `isTechnical=true`; `clinica` entra como technical em [`lib/copsoq/auth/access.ts`](../lib/copsoq/auth/access.ts).
- Impacto: leitura/ação fora do tenant.
- Severidade/Probabilidade: **Alto / Médio**.
- Mitigação: separar role clínica de técnico global; checar escopo em toda API por `company_id`.
- Teste local: autenticar como clínica e consultar endpoints COPSOQ/imports com `companyId` de outra empresa.
- Aprovação: 403 consistente fora do escopo.

### B. Bypass de autenticação
- Evidência: `middleware.ts` protege rotas privadas; APIs críticas usam sessão/contexto.
- Risco residual: endpoint público de formulário pode ser usado sem login (esperado).
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: manter cobertura de middleware + checks server-side por rota.
- Teste: `curl` em `/dashboard`, `/admin`, `/clinic`, `/portal` sem cookie.
- Aprovação: redireciona/nega sem 500.

### C. Escalada de privilégio
- Evidência: clínica tratada como technical (`isTechnicalProfile`) e com amplo escopo em COPSOQ/import.
- Severidade/Probabilidade: **Alto / Médio**.
- Mitigação: matriz explícita de permissões; bloquear operações técnicas para clínica se não for regra de negócio.
- Teste: conta clínica tentando recompute aggregate/import para empresa terceira.
- Aprovação: 403 para operações não autorizadas.

### D. Vazamento via `NEXT_PUBLIC_`
- Evidência: uso de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.
- Sem evidência de segredo privado em `NEXT_PUBLIC_*`.
- Severidade/Probabilidade: **Baixo / Baixo**.
- Mitigação: manter revisão de env e CI guardrail.

### E. Reuso de token de convite
- Evidência: hash SHA-256 + status (`pending/used/revoked/expired`) e consumo atômico via `consumePendingInviteMongoById`.
- Severidade/Probabilidade: **Médio / Baixo**.
- Risco: em falha de sincronismo Mongo/Supabase pode haver inconsistência operacional.
- Mitigação: validação única na fonte autoritativa e reconciliação robusta.

### F. Força bruta/enumeração de convite
- Evidência: token 16 bytes hex (32 chars) + rate limit em `validate`.
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: manter rate limit + observabilidade de tentativas + bloquear padrões.

### G. Reset de senha
- Evidência: fluxo em [`app/auth/reset-password/page.tsx`](../app/auth/reset-password/page.tsx), mensagens genéricas.
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: manter respostas não enumeráveis e expiração curta.

### H. NoSQL/query injection
- Evidência: filtros montados com valores normalizados/strings; sem eval/query dinâmica.
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: seguir validadores estritos por payload.

### I. SQL/RLS/Auth bypass no Supabase
- Evidência: backend usa `SUPABASE_SERVICE_ROLE_KEY` amplamente em server routes.
- Risco: autorização depende do código backend, não apenas RLS.
- Severidade/Probabilidade: **Alto / Médio**.
- Mitigação: reforçar RLS e políticas mesmo para consultas sensíveis; minimizar service-role fora de rotas admin.

### J. XSS
- Evidência: React escapa render; e-mail usa `escapeHtml`; sem `dangerouslySetInnerHTML` crítico em páginas analisadas.
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: continuar sanitização em qualquer HTML dinâmico futuro.

### K. CSV/Excel Injection
- Evidência: importação aceita células textuais sem neutralização de prefixos de fórmula.
- Severidade/Probabilidade: **Médio / Médio** (principalmente quando dados forem exportados/abertos em planilha).
- Mitigação: neutralizar células iniciadas com `=`, `+`, `-`, `@` em exportações e pontos de exibição planilhável.

### L. Upload/import malicioso
- Evidência: limite 5MB em preview/upload; parse defensivo.
- Risco residual: endpoints sem limite de body em JSON específicos.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: limites de payload padronizados + timeout.

### M. Rate limit bypass
- Evidência: muitos endpoints com `checkRateLimit`; alguns admin não possuem throttle explícito.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: rate limit também em endpoints autenticados de alto impacto.

### N. Vazamento de stack trace/detalhes internos
- Evidência: múltiplas rotas retornam `details: [error.message]` ou `[code]` em 500.
- Severidade/Probabilidade: **Alto / Alto**.
- Mitigação: em produção, retornar erro genérico e logar detalhe só no servidor com redaction.

### O. Falha de e-mail/Resend
- Evidência: `sendFormInvite` lança `RESEND_SEND_FAILED:*`; algumas rotas retornam detalhes ao cliente.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: não propagar erro bruto ao cliente; mapear para códigos internos.

### P. Falha de conexão com banco
- Evidência: fallback/mirror parcial; healthcheck Mongo retorna detalhes.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: padronizar mensagens amigáveis e circuit-breaker.

### Q. Headers de segurança
- Evidência: `applySecurityHeaders` bom conjunto (CSP, HSTS, XFO etc), mas aplicado só no matcher.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: aplicar headers globalmente (incluindo `/` e demais públicas).

### R. CORS
- Evidência: origem baseada em `FRONTEND_URL`; credenciais habilitadas.
- Severidade/Probabilidade: **Médio / Baixo**.
- Mitigação: validar lista explícita de origens por ambiente.

### S. DoS leve por payload grande
- Evidência: alguns endpoints com `content-length` guard, outros sem.
- Severidade/Probabilidade: **Médio / Médio**.
- Mitigação: limites uniformes por rota (JSON/form-data) e rejeição antecipada.

### T. Vazamento entre empresas (multi-tenant)
- Evidência forte:
  - role clínica com escopo técnico global em `canAccessCompanyScope`.
  - submissão por convite em `forms/[templateId]/submit` salva `company_id` nulo no branch de token.
- Severidade/Probabilidade: **Crítico / Médio**.
- Mitigação: fixar vínculo de tenant em toda escrita/leitura; role matrix explícita e testes de isolamento.

---

## 4) Tabela de riscos

| ID | Categoria | Arquivo/rota | Severidade | Prob. | Impacto | Status | Evidência | Correção recomendada | Prioridade |
|---|---|---|---|---|---|---|---|---|---|
| RSK-001 | Escopo multi-tenant | `lib/copsoq/auth/access.ts` | **Crítico** | Médio | Alto | Aberto | `clinica` tratada como technical; `canAccessCompanyScope` amplo | Revisar matriz de role e restringir clínica | P0 |
| RSK-002 | Integridade/tenant em submissão | `app/api/forms/[templateId]/submit/route.ts` | **Alto** | Médio | Alto | Aberto | Branch de `inviteToken` não resolve `company_id/collaborator` | Derivar `company_id` do convite/template/collaborator | P0 |
| RSK-003 | Exposição de erro interno | múltiplas APIs (`details:[error.message]`) | **Alto** | Alto | Médio/Alto | Aberto | retorno de mensagens internas em 500 | Sanitizar resposta em produção + redaction em log | P0 |
| RSK-004 | Enumeração de colaboradores por CNPJ | `app/api/forms/collaborators/route.ts` | Alto | Médio | Médio | Aberto | endpoint público retorna lista de colaboradores ativos | exigir token de convite ou challenge adicional | P1 |
| RSK-005 | Exposição de template por ID | `app/api/forms/[templateId]/route.ts` | Médio | Médio | Médio | Aberto | leitura pública de schema por id | validar contexto de convite ou assinatura | P1 |
| RSK-006 | Dependência rígida de Redis em prod | `lib/security/rate-limit.ts` | Médio | Médio | Alto (disponibilidade) | Aberto | throw se Upstash indisponível | fallback controlado + alerta | P1 |
| RSK-007 | Headers de segurança não globais | `middleware.ts` matcher | Médio | Médio | Médio | Aberto | home/públicas fora de matcher custom | ampliar aplicação de headers | P1 |
| RSK-008 | DoS por payload em rotas sem limite | várias APIs JSON | Médio | Médio | Médio | Aberto | ausência de cap uniforme | padronizar limites de body | P2 |
| RSK-009 | CSV/Excel formula risk | parsers/import | Médio | Baixo/Médio | Médio | Aberto | células não neutralizadas | neutralizar no fluxo de export/preview | P2 |
| RSK-010 | CORS com credenciais + origem única | `lib/security/http.ts` | Baixo/Médio | Baixo | Médio | Monitorar | política fixa por env | allowlist explícita por ambiente | P3 |

---

## 5) Erros de código com potencial de falha de segurança

- Ausência de verificação de tenant consistente em alguns caminhos de formulário por convite (RSK-002).
- Permissões divergentes entre perfil clínico e escopo técnico global (RSK-001).
- Respostas de erro muito detalhadas em produção (`error.message`, códigos internos) em diversas rotas.
- Endpoints públicos sensíveis para enumeração de dados operacionais (`/api/forms/collaborators`).
- Dependência de autorização em backend com service-role amplo; reforço de RLS recomendado.
- Logs/erros de integração podem vazar detalhe operacional se não houver redaction centralizado.

---

## 6) Matriz de permissões esperada (x observado)

| Recurso | Visitante | Empresa | Clínica | Admin | Funcionário com token |
|---|---|---|---|---|---|
| `/` | Permitir | Permitir | Permitir | Permitir | Permitir |
| `/login` | Permitir | Permitir | Permitir | Permitir | Permitir |
| `/dashboard` | Negar/redirect | Permitir | Negar/redirect | Permitir | Negar |
| `/admin` | Negar | Negar | Negar | Permitir | Negar |
| `/clinic` | Negar | Negar | Permitir | Permitir | Negar |
| `/portal` (sem token) | Negar | Permitir | Permitir | Permitir | Negar |
| `/portal/[token]` | Permitir c/ token válido | Permitir c/ token | Permitir c/ token | Permitir c/ token | Permitir c/ token |
| Formulário por token | Permitir c/ token válido | idem | idem | idem | Permitir |
| API convite (`/api/forms/invites/send`) | Negar | Esperado: escopo próprio | **Hoje: amplo para clínica/técnico** | Permitir | Negar |
| API submissão (`/api/forms/[templateId]/submit`) | Permitir (fluxo público) | Permitir | Permitir | Permitir | Permitir |
| APIs importação | Negar | Escopo próprio | **Hoje: potencial amplo** | Permitir | Negar |
| APIs administrativas | Negar | Negar | Negar (exceto leituras específicas se regra) | Permitir | Negar |

Divergências relevantes: escopo de clínica/técnico em APIs COPSOQ/import e vínculo de tenant na submissão por convite.

---

## 7) Checklist de validação segura (local)

### Comandos
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

### Testes manuais seguros
- Acessar rotas privadas sem login (esperar redirect/401/403, nunca 500).
- Login com perfis diferentes e validar escopo de dados por empresa.
- Convite/token inválido, expirado e já usado.
- Planilha inválida, vazia e colunas faltantes.
- Ambiente local controlado sem uma env crítica (mensagem clara, sem segredo).
- Revisar logs para garantir ausência de secrets/tokens completos.

---

## 8) Recomendações técnicas (médio/alto/crítico)

1. **Restringir escopo de clínica**  
   Arquivo: `lib/copsoq/auth/access.ts`  
   Ação: separar `clinica` de `isTechnical` global, ou exigir vínculo explícito de empresas permitidas.  
   Teste: suíte de autorização por role x companyId.

2. **Fixar `company_id` em submissão por convite**  
   Arquivo: `app/api/forms/[templateId]/submit/route.ts`  
   Ação: derivar company/collaborator do convite/template e gravar sempre com tenant definido.  
   Teste: submissão por token deve persistir tenant correto.

3. **Sanitizar erros em produção**  
   Arquivos: APIs com `details: [error.message]`  
   Ação: retornar códigos genéricos ao cliente; log interno com redaction.  
   Teste: forçar falhas e confirmar resposta sem detalhe interno.

4. **Reforçar proteção anti-enumeração em APIs públicas**  
   Arquivo: `app/api/forms/collaborators/route.ts`  
   Ação: exigir contexto de convite/token ou challenge adicional.  
   Teste: CNPJ aleatório não deve revelar estrutura de colaboradores.

5. **Padronizar limite de payload**  
   Arquivos: rotas JSON/form-data críticas  
   Ação: limites uniformes + resposta 413 antecipada.  
   Teste: payload acima do limite retorna 413 sem consumo excessivo.

---

## 9) Plano de correção por prioridade

### Fase 1 — Bloqueadores antes de produção
- RSK-001 (escopo clínica/técnico)
- RSK-002 (tenant nulo em submissão por convite)
- RSK-003 (vazamento de erro interno)
- Revisão final de isolamento empresa A/B em APIs COPSOQ/import/forms

### Fase 2 — Melhorias importantes
- Endurecer enumeração em APIs públicas de formulário
- Rate limit adicional em endpoints autenticados sensíveis
- Headers de segurança em cobertura global
- Padronização de mensagens de erro e logs

### Fase 3 — Hardening contínuo
- Observabilidade de segurança (alertas de abuso por IP/role)
- Auditoria periódica de permissões
- Testes automatizados de autorização multi-tenant
- Monitoramento de disponibilidade de Redis/rate-limit

---

## 10) Veredito final

**Veredito: Aprovado apenas para ambiente controlado/MVP.**

### Justificativa
- O projeto tem boa base defensiva (rate limit em várias rotas, hash de token, middleware de proteção, validações).
- Porém há riscos relevantes para produção empresarial:
  - risco de escopo amplo para clínica/técnico (multi-tenant),
  - risco de persistência sem tenant no fluxo de convite,
  - exposição de detalhes internos em erros.

### Sobre VPS 512 MB
- Tecnicamente, o ajuste de runtime para VPS pequena é viável (standalone + PM2 single process já existe).
- Segurança e isolamento de dados devem ser tratados antes de produção plena.

### Riscos de dados/secrets/permissões (estado atual)
- Vazamento entre empresas: **risco material** (precisa correção fase 1).
- Vazamento de secrets em repositório: **não evidenciado** na leitura atual.
- Acesso indevido por usuário sem permissão: **risco moderado/alto** em cenários de escopo técnico.

---

## Arquivos principais analisados

- Segurança/infra: `middleware.ts`, `lib/security/http.ts`, `lib/security/rate-limit.ts`, `lib/env/required.ts`, `next.config.mjs`, `ecosystem.config.cjs`
- Auth/roles: `lib/auth/guards.ts`, `lib/copsoq/auth/access.ts`, `lib/supabase/*`
- APIs forms/invites: `app/api/forms/*`
- APIs admin/import: `app/api/admin/*`, `app/api/imports/*`
- APIs COPSOQ/analytics/sync: `app/api/copsoq/*`, `app/api/analytics/*`, `app/api/sync/route.ts`
- UI/fluxos críticos: `app/login/page.tsx`, `app/dashboard/*`, `app/clinic/page.tsx`, `app/portal/*`, `app/auth/reset-password/page.tsx`
- Integrações: `lib/email/send-form-invite.ts`, `lib/mongodb/*`, `.env.example`

---

## Limitações da análise

- Revisão predominantemente estática (sem pentest ativo e sem carga real).
- Não houve execução de ataques destrutivos, envio real de e-mail, nem escrita intencional em produção.
- Sem validação direta de políticas RLS no Supabase (depende do ambiente externo).
- Alguns riscos dependem da regra de negócio final (ex.: nível de acesso esperado para perfil clínica/técnico).

