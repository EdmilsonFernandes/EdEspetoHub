# EdEspetoHub (Já no Caminho) — Regras do Projeto

> **Guia completo**: `.ai/SKILL.md` (arquitetura, deploy, migrations, operações, integrações).
> **Graphify**: knowledge graph em `graphify-out/` — use `graphify query "<pergunta>"` para navegar o código.

## 📂 Framework `.claude/` (ler on-demand conforme a tarefa)
Documentação modular — **não** carregada toda sessão (contexto leve); ler quando relevante:
- [`STARTUP.md`](.claude/STARTUP.md) — bootstrap + sequência de inicialização + estado real dos MCPs.
- [`AGENTS.md`](.claude/AGENTS.md) — papel de cada MCP (Graphify/Serena/GSD/Context7) + fallbacks.
- [`GRAPH_RULES.md`](.claude/GRAPH_RULES.md) — consultar o grafo antes de alterar (impacto/reuso/duplicação).
- [`ARCHITECTURE.md`](.claude/ARCHITECTURE.md) — multi-serviço, ports, BFF, deploy com approval, migrations TypeORM.
- [`DESIGN_SYSTEM.md`](.claude/DESIGN_SYSTEM.md) — identidade (azul `#2f9df7`/verde `#5fd35a`/laranja), Tailwind 4, UI.
- [`TASK_RULES.md`](.claude/TASK_RULES.md) — pipeline + validação + definição de "concluído".
> **Regra operacional principal**: `.ai/agent-rules.md`. **Ops profundo**: `.ai/SKILL.md`.

## Stack (NÃO MUDAR SEM PENSAR)
- **Frontend**: React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS 4 + Capacitor 7 (porta 8080)
- **Backend**: Express 4 + TypeORM 0.3 + PostgreSQL 16 + Redis 7 (porta 4000)
- **APIs (BFF)**: Express 4 — proxy/gateway entre frontend e backend (porta 5000)
- **Face Worker**: Python FastAPI (verificação facial de motoboys, porta 8000)
- **Mobile**: Capacitor 7, appId `com.janocaminho.app`, server URL `https://janocaminho.com.br/hub`
- **DB**: `espetinho` em PostgreSQL (porta 5432), volume `edespetohub_postgres-data`
- **Push**: Firebase project `ja-no-caminho-mobile`, key em `backend/keys/`

## Arquitetura (NÃO confundir)
```
Browser/App → Nginx (EC2:443)
  → /          → Frontend (:8080)
  → /api/*     → APIs BFF (:5000) → Backend (:4000) → PostgreSQL + Redis
  → /uploads/* → Backend (:4000)
```
- Frontend **NUNCA** fala direto com o backend — sempre via BFF.
- Containers: `janocaminho-{frontend,apis,backend,postgres,redis,pgadmin,face-worker}`.

## Validação OBRIGATÓRIA antes de commitar
| Mudança | Comando |
|---|---|
| Backend | `cd backend && yarn test` (100% verde antes de commit) |
| Frontend | `cd frontend && npm run test:unit && npm run build` |
| Migration | `cd backend && npm run migrate:status` (0 pending) + `yarn test` |
| Mobile | `npm --prefix frontend run build && npm --prefix mobile run android:sync` |

- **NUNCA** rodar E2E contra o banco de produção.
- **NUNCA** editar migration já aplicada — criar nova corretiva.

## Deploy (NÃO rodar via SSH — o usuário faz)
- **GHCR**: push na main → `publish-ghcr.yml` builda + publica imagens (`ghcr.io/edmilsonfernandes/janocaminho-{backend,frontend,apis}`).
- **Deploy**: `deploy-production.yml` (com approval) → SSH EC2 → `deploy-release.sh <sha> <services>`.
- **Ou manual**: `scripts/deploy-release-{frontend,api,apis}.sh <sha>`.
- **Pós-deploy**: validar `SELECT COUNT(*) FROM users;` (se voltar 0 = sem dump/seed).

## Migrations (MANDATÓRIO seguir o padrão)
- **Arquivo**: `backend/docs/MIGRATION_STANDARD.md`.
- Criar em `backend/src/migrations/YYYYMMDD_NNN_nome.ts`.
- **Registrar** em `backend/src/migrations/index.ts` (não registrado = não roda).
- Atualizar `backend/schema.sql` + regenerar `backend/docs/database-schema.html`.
- **NUNCA** editar migration aplicada.

## APK/AAB
- **versionCode +1 SEMPRE** antes de AAB (`mobile/android/app/build.gradle`).
- Build: `cd mobile/android && ./gradlew.bat clean bundleRelease` (sempre `clean` antes — evita Java heap space).

## Top Gotchas
| Problema | Fix |
|---|---|
| Nginx 413 (upload logo) | `client_max_body_size 20m;` no nginx conf |
| pg_hba.conf corrompido | Ver SKILL.md "PostgreSQL Recovery" |
| Email Zoho `550 5.4.6` | Painel Zoho → unblock; nunca deletar conta |
| WebView file picker Android | `MainActivity.java` com `onShowFileChooser` nativo |
| `chamanoespeto.com.br` SSL expirado | Migrando pra `janocaminho.com.br` (ver TODO_MIGRACAO) |

## Proibições
- **NUNCA** deployar via SSH (o usuário roda os scripts).
- **NUNCA** `git pull` no servidor sem pedido explícito.
- **NUNCA** commitar secrets/`.env`/keys/`.pem`/`.jks`/`.apk`/`.aab`.
- **NUNCA** refatorar rotas/auth/regras de negócio sem pedido claro.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

# Skills de UI/UX e Produto

Quando a tarefa envolver tela, layout, app, mobile, web, desktop, painel admin, design, responsividade ou experiência visual, carregar as skills abaixo conforme necessidade:

- `.claude/skills/product-designer.md`
- `.claude/skills/ui-ux-reviewer.md`
- `.claude/skills/mobile-first-designer.md`
- `.claude/skills/design-system-guardian.md`
- `.claude/skills/extract-design-system.md` — extrai tokens de design (cores, tipografia, espaçamento, radius, sombras) de sites públicos via `npx extract-design-system <url>`. Útil para inspiração/onboarding de cliente; **não** sobrescreve a identidade atual sem aprovação.
- `.claude/skills/frontend-refactor.md`
- `.claude/skills/playwright-visual-qa.md`
- `.claude/skills/accessibility-reviewer.md`
- `.claude/skills/performance-reviewer.md`
- `.claude/skills/cybersecurity-reviewer.md`
- `.claude/skills/conversion-copywriter.md`

## Ordem recomendada para tarefas de tela

1. Graphify para mapear componentes, rotas, estilos, services e dependências.
2. design-system-guardian para preservar identidade visual.
3. product-designer para avaliar jornada e objetivo da tela.
4. ui-ux-reviewer para revisar layout, hierarquia, contraste, espaçamento e estados.
5. mobile-first-designer para garantir responsividade.
6. accessibility-reviewer para revisar contraste, labels, foco e navegação.
7. frontend-refactor para implementar com código limpo.
8. performance-reviewer quando houver lentidão, listas grandes ou tela pesada.
9. cybersecurity-reviewer quando houver login, dados sensíveis, exames, upload, IA, admin ou API.
10. playwright-visual-qa para validar visualmente.

## Antes de alterar código de tela

Sempre listar:

- arquivos envolvidos;
- fluxo atual;
- problemas encontrados;
- riscos;
- plano de alteração;
- validação prevista.

Não alterar nada grande sem plano.

## Como usar as skills

Quando eu pedir melhoria de tela, layout, mobile, desktop, web, painel admin ou UX, o agente deve:

1. Ler esta seção.
2. Abrir as skills relevantes em `.claude/skills/`.
3. Usar Graphify antes de mexer no código.
4. Usar Serena para localizar arquivos reais.
5. Usar Playwright para validar visualmente quando houver alteração de tela.