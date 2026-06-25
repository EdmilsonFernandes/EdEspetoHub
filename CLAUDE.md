# EdEspetoHub (Já no Caminho) — Regras do Projeto

> **Guia completo**: `.ai/SKILL.md` (arquitetura, deploy, migrations, operações, integrações).
> **Graphify**: knowledge graph em `graphify-out/` — use `graphify query "<pergunta>"` para navegar o código.

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
