# Arquitetura — EdEspetoHub (Já no Caminho)

Marketplace local multi-segmento (mercado, farmácia, adega, food truck, restaurantes, destinos turísticos, condomínios, entrega por motoboy). Ops profundo: `.ai/SKILL.md` + `docs/SERVIDOR_PRODUCAO.md`.

## Stack (NÃO MUDAR SEM PENSAR)
| Serviço | Stack | Porta |
|---|---|---|
| `frontend/` | React 19 + Vite 6 + TypeScript 5.7 + **Tailwind CSS 4** + Capacitor 7 | 8080 |
| `backend/` | Express 4 + **TypeORM 0.3** + PostgreSQL 16 + **Redis 7** | 4000 |
| `apis/` (BFF) | Express 4 — proxy/gateway entre frontend e backend | 5000 |
| `face-worker/` | **Python FastAPI** (verificação facial de motoboys) | 8000 |
| `mobile/` | Capacitor 7, `appId com.janocaminho.app`, server `https://janocaminho.com.br/hub` | — |

- **DB:** `espetinho` em PostgreSQL (porta 5432), volume `edespetohub_postgres-data`.
- **Push:** Firebase project `ja-no-caminho-mobile`, key em `backend/keys/`.

## Topologia (NÃO confundir)
```
Browser/App → Nginx (EC2:443)
  → /          → Frontend (:8080)
  → /api/*     → APIs BFF (:5000) → Backend (:4000) → PostgreSQL + Redis
  → /uploads/* → Backend (:4000)
```
- **Frontend NUNCA fala direto com o backend** — sempre via BFF (`apis/`).
- Containers: `janocaminho-{frontend,apis,backend,postgres,redis,pgadmin,face-worker}`.
- **NUNCA tocar** em containers de outros projetos no mesmo host.

## Deploy (COM APPROVAL — o usuário faz)
- **GHCR:** push na `main` → `publish-ghcr.yml` builda + publica imagens (`ghcr.io/edmilsonfernandes/janocaminho-{backend,frontend,apis}`).
- **Deploy:** `deploy-production.yml` **com approval** → SSH EC2 → `deploy-release.sh <sha> <services>`.
- **Manual:** `scripts/deploy-release-{frontend,api,apis}.sh <sha>`.
- **NÃO rodar deploy via SSH** proativamente — o usuário executa os scripts.
- **Pós-deploy:** validar `SELECT COUNT(*) FROM users;` (0 = sem dump/seed).

## Migrations (MANDATÓRIO — padrão TypeORM)
- Padrão: `backend/docs/MIGRATION_STANDARD.md`.
- Criar em `backend/src/migrations/YYYYMMDD_NNN_nome.ts`.
- **Registrar** em `backend/src/migrations/index.ts` (não registrado = não roda).
- Atualizar `backend/schema.sql` + regenerar `backend/docs/database-schema.html`.
- **NUNCA editar migration já aplicada** — criar nova corretiva.

## Serviços auxiliares / domínios
- Jobs em background: ver `docs/BACKEND_JOBS.md`.
- Verificação facial: `docs/FACE_VERIFY.md` + `face-worker/`.
- Domínios de produto: `docs/DESTINATION_HUB.md`, `docs/CONDOMINIUM_HUB_PLAN.md`, `docs/DELIVERY.md`, `docs/POSTAL_SHIPPING_TRACKING.md`.

## Decisões de stack (por que estas versões)
Ver `.ai/SKILL.md` e `.ai/agent-rules.md`. (Mantidos como ops profundo.)
