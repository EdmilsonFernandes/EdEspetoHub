# STACK

| Camada | Tecnologia | Porta |
|---|---|---|
| Frontend | React 19 + Vite 6 + TS 5.7 + Tailwind **4** + Capacitor 7 | 8080 |
| Backend | Express 4 + TypeORM 0.3 + PostgreSQL 16 + Redis 7 | 4000 |
| BFF (apis) | Express 4 — proxy/gateway obrigatório | 5000 |
| Face Worker | Python FastAPI (verificação facial motoboy) | 8000 |
| Mobile | Capacitor 7, `com.janocaminho.app`, serverUrl `janocaminho.com.br/hub` | — |
| DB | `espetinho` @ Postgres (volume `edespetohub_postgres-data`) | 5432 |
| Push | Firebase `ja-no-caminho-mobile` (keys em `backend/keys/`) | — |

Identidade: azul `#2f9df7` (primary) · verde `#5fd35a` (sucesso) · laranja
pontual (CTA/preço). Tokens vivos em `frontend/src/index.css`; detalhe em
`.claude/DESIGN_SYSTEM.md`. NÃO trocar stack sem decisão (ADR novo).
