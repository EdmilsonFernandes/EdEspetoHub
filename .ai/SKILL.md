---
name: edespetohub-dev
description: Regras, convenções, gotchas e procedimentos do projeto EdEspetoHub / Já no Caminho (React + Express + TypeORM + Capacitor + PostgreSQL + Redis + Firebase + Mercado Pago). Use ao tocar qualquer parte do código, buildar, deployar ou debugar.
---

# EdEspetoHub (Já no Caminho) — Skill de Desenvolvimento

## Stack
| Componente | Versão/Config |
|---|---|
| Frontend | React 19.2 + Vite 6 + TypeScript 5.7 + Tailwind CSS 4 |
| Backend | Express 4.19 + TypeORM 0.3 + PostgreSQL 16 |
| APIs (BFF) | Express 4.21 — proxy/gateway (150+ rotas) |
| Cache | Redis 7 (Alpine, LRU) |
| Mobile | Capacitor 7.4 (appId `com.janocaminho.app`) |
| Face Worker | Python FastAPI + Buffalo_l (verificação facial motoboys) |
| Push | Firebase (`ja-no-caminho-mobile`) |
| Pagamento | Mercado Pago (OAuth + webhook) |
| Email | Nodemailer via Zoho SMTP (`contato@janocaminho.com.br`) |
| Storage | AWS S3 + volume local fallback |

## Arquitetura (monorepo, 4 serviços)
```
frontend/   → React SPA (porta 8080, nginx)
backend/    → Express API (porta 4000, TypeORM, jobs, webhooks)
apis/       → BFF/Gateway (porta 5000, proxy + auth processors)
mobile/     → Capacitor 7 (embrulha frontend → APK/AAB)
face-worker/→ Python FastAPI (porta 8000)
```
```
Browser → Nginx (EC2:443)
  → /          → frontend (:8080)
  → /api/*     → apis/BFF (:5000) → backend (:4000) → PostgreSQL + Redis
  → /uploads/* → backend (:4000)
```
- Frontend **NUNCA** fala direto com backend — sempre via BFF.
- Containers: `janocaminho-{frontend,apis,backend,postgres,redis,pgadmin,face-worker}`.

## Deploy
- **GHCR**: push na `main` → `publish-ghcr.yml` detecta mudanças por serviço → builda + publica imagens (`ghcr.io/edmilsonfernandes/janocaminho-{backend,frontend,apis,face-worker}`).
- **Deploy CI**: `deploy-production.yml` (com **approval** no environment `production`) → SSH EC2 → `scripts/deploy-release.sh <sha> <services>`.
- **Deploy manual**: `scripts/deploy-release-{frontend,api,apis}.sh <sha>`.
- **NÃO builda na EC2** — só pull de imagem pronta.
- **Concurrency**: builds cancelam os anteriores (evita race no `:latest`).

## Validação OBRIGATÓRIA
| Tipo | Comando |
|---|---|
| Backend | `cd backend && yarn test` (100% antes de commit) |
| Frontend | `cd frontend && npm run test:unit && npm run build` |
| Frontend E2E | `npm run test:e2e` (NUNCA contra prod DB) |
| Schema | Migration + `yarn test` + `npm run migrate:status` (0 pending) |
| Mobile | `npm --prefix frontend run build && npm --prefix mobile run android:sync` |

## Migrations (padrão OBRIGATÓRIO — `backend/docs/MIGRATION_STANDARD.md`)
1. Criar em `backend/src/migrations/YYYYMMDD_NNN_nome.ts`.
2. Exportar `SchemaMigration` com `id`, `name`, `checksumSource`, `up()`.
3. **Registrar** em `backend/src/migrations/index.ts` (não registrado = não roda).
4. Atualizar `backend/schema.sql` (pra fresh installs).
5. Regenerar `backend/docs/database-schema.html` (`npm run docs:schema`).
6. Rodar `yarn test` + `npm run migrate:status`.
- **NUNCA** editar migration aplicada — criar nova corretiva.
- Tabela de controle: `app_schema_migrations` (colunas: `app_version`, `git_sha`).

## SSH EC2 (Operações)
```bash
# Chave (WSL)
cp "/mnt/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem" /tmp/jnc.pem && chmod 600 /tmp/jnc.pem
ssh -i /tmp/jnc.pem ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com

# Logs
docker logs janocaminho-backend --tail 50 -f
docker logs janocaminho-apis --tail 50 -f

# Query DB
docker exec janocaminho-postgres psql -U postgres -d espetinho -c "SELECT ...;"

# Restart container
docker restart janocaminho-backend

# Health check
curl -fsS http://127.0.0.1:5000/health
curl -fsS https://www.janocaminho.com.br/ >/dev/null
```
- **NUNCA** tocar `meus-exames-app` container (roda o outro projeto).
- **NUNCA** deployar via SSH (o usuário faz via scripts/deploy-release).
- **fail2ban**: se "Connection reset", esperar e retry.

## Procedimentos de Emergência

### Site fora do ar
1. `docker ps` — containers up?
2. `docker logs janocaminho-backend --tail 150` — erro?
3. `docker restart janocaminho-backend` (ou apis/frontend conforme).
4. `curl http://127.0.0.1:5000/health`.

### PostgreSQL pg_hba.conf corrompido (EOF connection type)
```bash
docker stop janocaminho-postgres
docker run --rm -v edespetohub_postgres-data:/var/lib/postgresql/data alpine \
  sh -c "printf 'local all all trust\nhost all all all trust\n' > /var/lib/postgresql/data/pg_hba.conf"
docker start janocaminho-postgres
docker exec -it janocaminho-postgres psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
docker run --rm -v edespetohub_postgres-data:/var/lib/postgresql/data alpine \
  sh -c "printf 'local all all scram-sha-256\nhost all all all scram-sha-256\n' > /var/lib/postgresql/data/pg_hba.conf"
docker restart janocaminho-postgres
```

### Backup manual
```bash
docker exec janocaminho-postgres pg_dump -U postgres -d espetinho -Fc -Z 6 -f /tmp/jnc-prod.dump
# Restore: docker cp + pg_restore
```

### Debug push
- Tokens por audiência: `customer_push_tokens`, `motoboy_push_tokens`, `store_user_push_tokens`.
- **NUNCA** logar token completo — usar `left(token, 16)`.
- Firebase Console → testar push pra token específico.

## APK/AAB
- **versionCode +1 SEMPRE** (`mobile/android/app/build.gradle`).
- Build: `cd mobile/android && ./gradlew.bat clean bundleRelease`.
- Sempre `clean` antes (evita Java heap space em builds sucessivas).
- WebView file picker Android: requer `onShowFileChooser` nativo em `MainActivity.java`.

## Mercado Pago
- App OAuth: `chamanoespeto` no painel dev.
- Webhook: `https://www.janocaminho.com.br/api/webhooks/mercadopago` (events: payments).
- Redirect URI: `https://www.janocaminho.com.br/api/payment-accounts/mercadopago/callback`.

## Email (Zoho SMTP)
- Host: `smtp.zoho.com:587`, User: `contato@janocaminho.com.br`.
- Templates: database-driven (`email_templates`, `email_template_versions`).
- Unsubscribe: só `category='marketing'` com `allowUnsubscribe=true`. Segurança sempre manda.
- `550 5.4.6`: Zoho bloqueou → unblock no painel. NUNCA deletar a conta do usuário.

## Geocoding (fallback chain)
- Ordem: `geoapify → locationiq → photon → openstreetmap`.
- Photon + OSM = grátis (com cache/limite). Sem keys funcionam.

## Configuração do Banco (site_settings)
- `home.config` → JSON (banners + popup).
- `trial_days` → INT (dias de trial grátis).
- `legal.terms` / `legal.lgpd` → TEXT.
- `store_settings.order_types` → JSON (`delivery`, `pickup`, `table`).
- `store_settings.table_service_settings` → JSON (couvert, taxa serviço).

## Local Dev (Docker)
- Frontend: `http://localhost:8080`, Backend: `http://localhost:4000`, BFF: `http://localhost:5000`.
- Swagger: `http://localhost:4000/api/docs`, pgAdmin: `http://localhost:5050`.
- Start: `sh scripts/compose-dev.sh` (ou individual por serviço).

## UI/UX (regras)
- Design refs: Material Design 3, Apple HIG, Laws of UX, Baymard.
- Mobile-first: bottom nav sempre preservada, min touch 44px, safe-area respeitada.
- `MarketplacePage.tsx` = orquestrador SÓ. Nova UI → `components/Marketplace/Hub/`. Nova lógica → `hooks/hub/`.
- `AppGlassHeader.tsx` pra sub-telas navegáveis.
- Preservar identidade do app (cores, radius, tipografia, ícones) em todas as telas.

## Proibições
- **NUNCA** deployar via SSH (scripts manuais com approval).
- **NUNCA** `git pull` no servidor sem pedido explícito.
- **NUNCA** commitar secrets/`.env`/keys/`.pem`/`.jks`/`.apk`/`.aab`.
- **NUNCA** refatorar rotas/auth/regras de negócio sem pedido claro.
- **NUNCA** rodar E2E contra banco de produção.
- **NUNCA** editar migration aplicada.

## Fluxo de Trabalho
1. Ler `.ai/agent-rules.md` + `AGENTS.md` antes de começar.
2. Implementar minimizando mudanças (só o pedido).
3. Validar: `yarn test` (backend) + `npm run build` (frontend).
4. Commit com mensagem descritiva.
5. Push → informar commit hash + qual script de deploy rodar.
6. Se migration: validar `migrate:status` (0 pending).
